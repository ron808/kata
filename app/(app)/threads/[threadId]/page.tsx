import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { contextFor } from "@/lib/companion/engine";
import { namesFor } from "@/lib/companion/naming";
import { connectDB } from "@/lib/db/mongoose";
import { seenThread, shareFriends, sharedThread } from "@/lib/social/sharing";
import { AppPage, EmptyNote } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";
import { SharedThread } from "@/components/threads/SharedThread";

export const metadata = { title: "Shared thread · Kata" };

/**
 * One thread as it's shared: its writer's own (to share it, pick who's on it and set where it
 * stands), or a friend's that's shared with them. Opening it reads what was new on it.
 */
export default async function SharedThreadPage({ params, searchParams }: { params: Promise<{ threadId: string }>; searchParams: Promise<{ share?: string }> }) {
  const session = await auth();
  const me = session!.user.id;
  const [{ threadId }, { share }] = await Promise.all([params, searchParams]);
  await connectDB();
  const [thread, ctx, { name }] = await Promise.all([sharedThread(me, threadId), contextFor(me), namesFor(me)]);
  if (!thread) {
    return (
      <AppPage>
        <EmptyNote
          action={
            <Link href="/threads" className={buttonClass({ variant: "secondary" })}>
              Back to Threads
            </Link>
          }
        >
          This thread isn’t shared with you, or it’s gone.
        </EmptyNote>
      </AppPage>
    );
  }
  const [friends] = await Promise.all([thread.mine ? shareFriends(me) : [], seenThread(me, threadId)]);
  return (
    <AppPage>
      <SharedThread key={thread._id} initial={thread} friends={friends} today={ctx.day} tz={ctx.tz} companion={name} sharing={share === "1"} />
    </AppPage>
  );
}
