import Link from "next/link";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { namesFor } from "@/lib/companion/naming";
import { loadMe, loadProfile, type SharedThreadT } from "@/lib/social/load";
import type { ThreadKind } from "@/lib/types";
import { AppPage, EmptyNote } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";
import { Icon, type IconName } from "@/components/shared/Icon";
import { KIND_LABEL, Status } from "@/components/shared/Status";
import { hue8 } from "@/components/people/labels";
import { MomentList } from "@/components/people/MomentList";
import { ProfileHeader } from "@/components/people/ProfileHeader";
import { Ago } from "@/components/people/time";
import { PeopleProvider } from "@/components/people/viewer";

type Params = Promise<{ handle: string }>;

const PROFILE_MOMENTS = 20;

/** One read per request, shared by the metadata and the page. */
const profileFor = cache(async (viewerId: string, handle: string) => loadProfile(viewerId, decodeURIComponent(handle)));

export async function generateMetadata({ params }: { params: Params }) {
  const { handle } = await params;
  const session = await auth();
  const data = session?.user?.id ? await profileFor(session.user.id, handle).catch(() => null) : null;
  return { title: data ? `${data.person.name} (@${data.person.handle}) · Kata` : "Not found · Kata" };
}

const KIND_ICON: Record<ThreadKind, IconName> = {
  project: "bolt",
  task: "check",
  goal: "target",
  habit: "refresh",
  person: "user",
  event: "calendar",
  health: "flame",
  learning: "page",
  other: "threads",
};

export default async function ProfilePage({ params }: { params: Params }) {
  const { handle } = await params;
  const session = await auth();
  const viewerId = session!.user.id;

  let data: Awaited<ReturnType<typeof profileFor>>;
  let me: Awaited<ReturnType<typeof loadMe>>;
  let names: Awaited<ReturnType<typeof namesFor>>;
  try {
    [data, me, names] = await Promise.all([profileFor(viewerId, handle), loadMe(viewerId), namesFor(viewerId)]);
  } catch (err) {
    console.error("profile:load", err);
    return (
      <AppPage>
        <p role="alert" data-hue="0" className="rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      </AppPage>
    );
  }
  if (!data) notFound();
  const { person, moments, sharedThreads } = data;
  // One address per person: /u/Mira and /u/@mira land on /u/mira.
  if (decodeURIComponent(handle) !== person.handle) permanentRedirect(`/u/${person.handle}`);

  const first = person.name.trim().split(/\s+/)[0] || person.name;
  const friends = person.isFollowing && person.followsYou;

  return (
    <PeopleProvider handle={me?.handle ?? null} suggested={me?.suggestedHandle}>
      <AppPage>
        <ProfileHeader person={person} unlisted={Boolean(person.isMe && me && !me.isPublic)} />

        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 xl:grid-cols-12">
          <section aria-labelledby="moments-heading" className="min-w-0 xl:col-span-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="moments-heading" className="font-display text-display-s">
                {person.isMe ? "What you’ve shared" : "Moments"}
              </h2>
              {person.isMe && moments.length ? (
                <Link href="/people#share" className="link inline-flex min-h-11 items-center text-[0.9375rem] font-semibold">
                  Share something
                </Link>
              ) : null}
            </div>
            <div className="mt-5">
              <MomentList
                moments={moments}
                empty={
                  person.isMe ? (
                    <EmptyNote
                      action={
                        <Link href="/people#share" className={buttonClass()}>
                          Share something
                        </Link>
                      }
                    >
                      Nothing shared yet. A win, a ship or a question: what you post shows up here, never your pages.
                    </EmptyNote>
                  ) : (
                    <EmptyNote>{first} hasn’t shared anything you can see yet.</EmptyNote>
                  )
                }
              />
            </div>
            <div className="mt-6 space-y-1 text-center text-[0.875rem] text-ink/65">
              {moments.length >= PROFILE_MOMENTS ? <p>The {PROFILE_MOMENTS} most recent.</p> : null}
              {!person.isMe && !friends ? <p>Friends-only moments show here once you follow each other.</p> : null}
            </div>
          </section>

          <aside className="min-w-0 max-xl:-order-1 xl:col-span-5" aria-labelledby="working-heading">
            <WorkingOn threads={sharedThreads} hue={person.hue} isMe={person.isMe} first={first} companionName={names.name} />
          </aside>
        </div>
      </AppPage>
    </PeopleProvider>
  );
}

function WorkingOn({
  threads,
  hue,
  isMe,
  first,
  companionName,
}: {
  threads: SharedThreadT[];
  hue: number;
  isMe: boolean;
  first: string;
  companionName: string;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 id="working-heading" className="font-display text-display-s">
        Working on
      </h2>
      <p className="mt-1.5 text-[0.875rem] text-ink/65">
        {isMe ? `Threads you chose to show. The rest stay between you and ${companionName}.` : `Threads ${first} chose to show.`}
      </p>
      {threads.length ? (
        <ul className="mt-3" data-hue={hue8(hue)}>
          {threads.map((t) => (
            <li key={`${t.title}-${t.lastTouchedAt}`} className="rule flex min-h-16 items-center gap-3 border-t-2 py-3 first:border-t-0">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-edge bg-hue text-on-hue">
                <Icon name={KIND_ICON[t.kind]} className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">{t.title}</p>
                <p className="mt-1 text-[0.8125rem] text-ink/65">
                  {KIND_LABEL[t.kind]} · <Ago iso={t.lastTouchedAt} />
                </p>
              </div>
              <Status status={t.status} />
            </li>
          ))}
        </ul>
      ) : isMe ? (
        <p className="mt-4 text-[0.9375rem] text-ink/75">
          Nothing shown yet. Open a thread and choose Show on my profile.{" "}
          <Link href="/threads" className="link font-semibold text-ink">
            Your threads
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-[0.9375rem] text-ink/75">{first} hasn’t shown any threads yet.</p>
      )}
    </section>
  );
}
