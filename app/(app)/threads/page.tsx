import { Suspense } from "react";
import { auth } from "@/lib/auth/authOptions";
import { contextFor } from "@/lib/companion/engine";
import { namesFor } from "@/lib/companion/naming";
import { listThreads, olderThreads } from "@/lib/companion/threads";
import { sharedPeople, sharedWithMe } from "@/lib/social/sharing";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { Memories, type MemoryT } from "@/components/threads/Memories";
import { ThreadsBoard } from "@/components/threads/ThreadsBoard";
import type { SharedRowT, ThreadT, Who } from "@/lib/types";

export const metadata = { title: "Threads · Kata" };

interface Loaded {
  threads: ThreadT[];
  memories: MemoryT[];
  today: string;
  tz: string;
  /** Friends' threads shared with them, and who each of theirs is shared with. */
  withMe: SharedRowT[];
  people: Record<string, Who[]>;
}

async function load(userId: string): Promise<Loaded | null> {
  try {
    const ctx = await contextFor(userId);
    const memories = (ctx.user.memories ?? [])
      .map((m) => ({ _id: String(m._id), text: m.text, at: new Date(m.at).toISOString() }))
      .reverse();
    const [current, older, withMe, people] = await Promise.all([listThreads(ctx, 100), olderThreads(ctx), sharedWithMe(userId), sharedPeople(userId)]);
    return { threads: [...current, ...older], memories, today: ctx.day, tz: ctx.tz, withMe, people };
  } catch (err) {
    console.error("threads:load", err);
    return null;
  }
}

export default async function ThreadsPage() {
  const session = await auth();
  const [data, { name }] = await Promise.all([load(session!.user.id), namesFor(session!.user.id)]);
  return (
    <AppPage>
      <PageHeader
        kicker={`${name}’s map of you`}
        title="Threads"
        lede={`Everything ${name} keeps track of for you: projects, goals, habits, people, dates. No one else on Kata sees these, unless you share one with friends or show it on your profile.`}
      />
      {data ? (
        <Suspense>
          <ThreadsBoard
            initial={data.threads}
            today={data.today}
            tz={data.tz}
            withMe={data.withMe}
            people={data.people}
            aside={<Memories key="memories" initial={data.memories} />}
          />
        </Suspense>
      ) : (
        <p role="alert" data-hue="0" className="mt-8 rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      )}
    </AppPage>
  );
}
