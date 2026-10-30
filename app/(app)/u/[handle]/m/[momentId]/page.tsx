import Link from "next/link";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Reply } from "@/lib/db/models/Reply";
import { momentsFor, repliesFor } from "@/lib/social/dto";
import { loadMe } from "@/lib/social/load";
import { findVisibleMoment } from "@/lib/social/visibility";
import { AppPage } from "@/components/shared/AppPage";
import { Avatar } from "@/components/shared/Avatar";
import { Icon } from "@/components/shared/Icon";
import { SingleMoment } from "@/components/people/SingleMoment";
import { PeopleProvider } from "@/components/people/viewer";

type Params = Promise<{ handle: string; momentId: string }>;

const REPLIES = 100;

/** The moment if the viewer may see it (else null, missing or hidden alike), with its replies. */
const momentFor = cache(async (viewerId: string, momentId: string) => {
  await connectDB();
  const doc = await findVisibleMoment(viewerId, momentId);
  if (!doc) return null;
  const [[moment], replies] = await Promise.all([
    momentsFor(viewerId, [doc]),
    Reply.find({ momentId: doc._id })
      .sort({ createdAt: 1, _id: 1 })
      .limit(REPLIES)
      .lean()
      .then((rs) => repliesFor(viewerId, rs)),
  ]);
  return moment ? { moment, replies } : null;
});

export async function generateMetadata({ params }: { params: Params }) {
  const { momentId } = await params;
  const session = await auth();
  const data = session?.user?.id ? await momentFor(session.user.id, momentId).catch(() => null) : null;
  if (!data) return { title: "Not found · Kata" };
  const text = data.moment.text.replace(/\s+/g, " ");
  return { title: `${data.moment.author.name}: “${text.length > 60 ? `${text.slice(0, 59)}…` : text}” · Kata` };
}

export default async function MomentPage({ params }: { params: Params }) {
  const { handle, momentId } = await params;
  const session = await auth();
  const viewerId = session!.user.id;

  let data: Awaited<ReturnType<typeof momentFor>>;
  let me: Awaited<ReturnType<typeof loadMe>>;
  try {
    [data, me] = await Promise.all([momentFor(viewerId, momentId), loadMe(viewerId)]);
  } catch (err) {
    console.error("moment:load", err);
    return (
      <AppPage width="text">
        <p role="alert" data-hue="0" className="rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      </AppPage>
    );
  }
  if (!data) notFound();
  const { moment, replies } = data;
  const author = moment.author;
  if (decodeURIComponent(handle) !== author.handle) permanentRedirect(`/u/${author.handle}/m/${moment._id}`);

  return (
    <PeopleProvider handle={me?.handle ?? null} suggested={me?.suggestedHandle}>
      <AppPage width="text">
        <Link
          href={`/u/${author.handle}`}
          className="-ml-1 inline-flex min-h-11 items-center gap-2.5 rounded-full pl-1 pr-3 text-[0.9375rem] font-semibold text-ink/75 transition-colors hover:text-ink"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          <Avatar name={author.name} hue={author.hue} size={28} />
          {moment.isMine ? "Your profile" : author.name}
        </Link>
        <h1 className="sr-only">
          {moment.isMine ? "Your moment" : `${author.name}’s moment`}
        </h1>
        <div className="mt-4">
          <SingleMoment moment={moment} replies={replies} />
        </div>
      </AppPage>
    </PeopleProvider>
  );
}
