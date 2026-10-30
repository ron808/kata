import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { loadFeed, loadMe, loadPeople } from "@/lib/social/load";
import type { PersonT } from "@/lib/types";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { Avatar } from "@/components/shared/Avatar";
import { PeopleHome, type PeopleFacets, type PeopleInitial, type PeopleMe } from "@/components/people/PeopleHome";
import { parseView, viewKey, type PeopleView } from "@/components/people/view";
import { loadFacets } from "./facets";

export const metadata = { title: "People · Kata" };

interface Loaded {
  me: PeopleMe;
  initial: PeopleInitial;
  suggested: PersonT[];
  following: PersonT[];
  facets: PeopleFacets;
}

async function load(viewerId: string, view: PeopleView): Promise<Loaded | null> {
  const find = view.tab === "find";
  const [me, listed, filtered, feed, facets] = await Promise.all([
    loadMe(viewerId),
    // Unfiltered: suggestions, and the people you follow for the header.
    loadPeople(viewerId),
    find && (view.q || view.role || view.tag)
      ? loadPeople(viewerId, { q: view.q || undefined, role: view.role || undefined, tag: view.tag || undefined })
      : null,
    find ? null : loadFeed(viewerId, { scope: view.tab === "discover" ? "discover" : "following", tag: view.tag || undefined }),
    loadFacets(viewerId),
  ]);
  if (!me) return null;
  return {
    me: {
      name: me.name,
      hue: me.hue,
      handle: me.handle,
      suggestedHandle: me.suggestedHandle,
      followerCount: me.followerCount,
      followingCount: me.followingCount,
      isPublic: me.isPublic,
    },
    initial: {
      key: viewKey(view),
      ...(feed ? { feed } : {}),
      ...(find ? { people: (filtered ?? listed).people } : {}),
    },
    suggested: listed.suggested,
    following: listed.people.filter((p) => p.isFollowing),
    facets,
  };
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const view = parseView(await searchParams);
  const data = await load(session!.user.id, view).catch((err) => {
    console.error("people:load", err);
    return null;
  });

  return (
    <AppPage>
      <PageHeader
        title="People"
        lede="What your people chose to share, and people worth finding."
        actions={data?.following.length ? <FollowingStack people={data.following} total={data.me.followingCount} /> : null}
      />
      {data ? (
        <PeopleHome me={data.me} initial={data.initial} suggested={data.suggested} facets={data.facets} />
      ) : (
        <p role="alert" data-hue="0" className="mt-8 rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      )}
    </AppPage>
  );
}

/** The people you follow, as a little stack of their stickers. */
function FollowingStack({ people, total }: { people: PersonT[]; total: number }) {
  const shown = people.slice(0, 5);
  return (
    <div className="flex items-center gap-3">
      <ul className="flex items-center" aria-label="People you follow">
        {shown.map((p, i) => (
          <li key={p.handle} className={i ? "-ml-3" : ""} style={{ zIndex: shown.length - i }}>
            <Link
              href={`/u/${p.handle}`}
              title={p.name}
              className="block rounded-full transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <Avatar name={p.name} hue={p.hue} size={48} className="shadow-sticker-sm" />
              <span className="sr-only">{p.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[0.875rem] leading-tight text-ink/70">
        You follow
        <br />
        <span className="font-semibold text-ink">
          {total} {total === 1 ? "person" : "people"}
        </span>
      </p>
    </div>
  );
}
