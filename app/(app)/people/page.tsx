import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { loadFeed, loadMe, loadPeople } from "@/lib/social/load";
import { peopleYouFollow } from "@/lib/social/people";
import type { PersonT } from "@/lib/types";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
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
  // Before anything runs in parallel, so no loader's first query comes ahead of the connection.
  await connectDB();
  const [me, listed, filtered, feed, facets, following] = await Promise.all([
    loadMe(viewerId),
    // Unfiltered: suggestions for Find people.
    loadPeople(viewerId),
    find && (view.q || view.role || view.tag)
      ? loadPeople(viewerId, { q: view.q || undefined, role: view.role || undefined, tag: view.tag || undefined })
      : null,
    find ? null : loadFeed(viewerId, { tag: view.tag || undefined }),
    loadFacets(viewerId),
    peopleYouFollow(viewerId),
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
    following,
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
      <PageHeader title="People" lede="Your people, and what they chose to share. Anyone else, you can look up by name." />
      {data ? (
        <PeopleHome me={data.me} initial={data.initial} suggested={data.suggested} following={data.following} facets={data.facets} />
      ) : (
        <p role="alert" data-hue="0" className="mt-8 rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      )}
    </AppPage>
  );
}
