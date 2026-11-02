"use client";

/**
 * PeopleHome — everything on /people under its header: the composer, the Following / Discover /
 * Find people switch and what it shows, and (from lg) a side column with you, people to follow
 * and this month's topics. The view lives in the URL (./view), so back, forward and reload all
 * land where you were; results are cached per view, so switching back is instant.
 *
 * Props come from app/(app)/people/page.tsx: me, initial (the first view's data), suggested,
 * facets (roles, interests and topics that exist).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/shared/Avatar";
import { Button, buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import type { MomentT, PersonT } from "@/lib/types";
import { api } from "./api";
import { Composer } from "./Composer";
import { HandleClaim } from "./HandleClaim";
import { hue8, plural } from "./labels";
import { MomentCard } from "./MomentCard";
import { PersonCard } from "./PersonCard";
import { PeopleProvider, useViewerHandle } from "./viewer";
import { parseView, viewHref, viewKey, type PeopleTab, type PeopleView } from "./view";

export interface PeopleMe {
  name: string;
  hue: number;
  handle: string | null;
  suggestedHandle?: string;
  followerCount: number;
  followingCount: number;
  isPublic: boolean;
}

export interface PeopleFacets {
  roles: string[];
  interests: string[];
  topics: string[];
}

export interface PeopleInitial {
  key: string;
  feed?: { moments: MomentT[]; next: string | null };
  people?: PersonT[];
}

interface FeedEntry {
  moments: MomentT[];
  next: string | null;
  stale?: boolean;
  more?: "loading" | "failed";
}

type Rel = Pick<PersonT, "isFollowing" | "followsYou"> & { followerCount?: number; was: boolean };
type FollowEvent = Pick<PersonT, "handle" | "isFollowing" | "followsYou"> & { followerCount?: number };

const TABS: { tab: PeopleTab; label: string; blurb: string }[] = [
  { tab: "following", label: "Following", blurb: "You and the people you follow, newest first." },
  { tab: "discover", label: "Discover", blurb: "Public moments from people you don’t follow yet, the liveliest first." },
  { tab: "find", label: "Find people", blurb: "Everyone who lists themselves publicly." },
];

const EMPTY_VIEW: PeopleView = { tab: "following", tag: "", q: "", role: "" };

function feedQuery(view: PeopleView, before?: string) {
  const p = new URLSearchParams({ scope: view.tab === "discover" ? "discover" : "following" });
  if (view.tag) p.set("tag", view.tag);
  if (before) p.set("before", before);
  return p.toString();
}

function findQuery(view: PeopleView) {
  const p = new URLSearchParams();
  if (view.q) p.set("q", view.q);
  if (view.role) p.set("role", view.role);
  if (view.tag) p.set("tag", view.tag);
  return p.toString();
}

const unique = (moments: MomentT[]) => {
  const seen = new Set<string>();
  return moments.filter((m) => (seen.has(m._id) ? false : (seen.add(m._id), true)));
};

export function PeopleHome(props: { me: PeopleMe; initial: PeopleInitial; suggested: PersonT[]; facets: PeopleFacets }) {
  return (
    <PeopleProvider handle={props.me.handle} suggested={props.me.suggestedHandle}>
      <PeopleBoard {...props} />
    </PeopleProvider>
  );
}

function PeopleBoard({
  me: meNow,
  initial,
  suggested: suggestedNow,
  facets,
}: {
  me: PeopleMe;
  initial: PeopleInitial;
  suggested: PersonT[];
  facets: PeopleFacets;
}) {
  // A refresh (after claiming a handle) must not pull people out from under you: someone you
  // just followed from the suggestions stays put, and counts move by what happens here.
  const [me] = useState(meNow);
  const [suggested] = useState(suggestedNow);
  const params = useSearchParams();
  const search = params.toString();
  const view = useMemo(() => parseView(new URLSearchParams(search)), [search]);
  const key = viewKey(view);

  const [feeds, setFeeds] = useState<Record<string, FeedEntry>>(() =>
    initial.feed ? { [initial.key]: { ...initial.feed } } : {}
  );
  const [finds, setFinds] = useState<Record<string, PersonT[]>>(() => (initial.people ? { [initial.key]: initial.people } : {}));
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [rels, setRels] = useState<Record<string, Rel>>({});
  const [fresh, setFresh] = useState<string | null>(null);

  // A refresh (after claiming a handle) brings new server data; keep what's already loaded.
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    if (initial.feed && !feeds[initial.key]) setFeeds((f) => ({ ...f, [initial.key]: { ...initial.feed! } }));
    if (initial.people && !finds[initial.key]) setFinds((f) => ({ ...f, [initial.key]: initial.people! }));
  }

  // Load what the current view needs, once; a stale feed reloads when you come back to it.
  const inflight = useRef(new Set<string>());
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    const entering = lastKey.current !== key;
    lastKey.current = key;
    const isFind = view.tab === "find";
    const cached = isFind ? finds[key] : feeds[key];
    if (cached && !(entering && !isFind && feeds[key]?.stale)) return;
    if (failed[key] || inflight.current.has(key)) return;
    inflight.current.add(key);
    const k = key;
    // A stale feed stays on screen while it reloads, and stays if the reload fails.
    const showing = Boolean(cached);
    if (isFind) {
      api<PersonT[]>(`/api/people?${findQuery(view)}`).then((r) => {
        inflight.current.delete(k);
        if (r.ok) setFinds((f) => ({ ...f, [k]: r.data }));
        else setFailed((x) => ({ ...x, [k]: true }));
      });
    } else {
      api<{ moments: MomentT[]; next: string | null }>(`/api/moments?${feedQuery(view)}`).then((r) => {
        inflight.current.delete(k);
        if (r.ok) setFeeds((f) => ({ ...f, [k]: { moments: r.data.moments, next: r.data.next } }));
        else if (!showing) setFailed((x) => ({ ...x, [k]: true }));
      });
    }
  }, [key, view, feeds, finds, failed]);

  // Next keeps useSearchParams in step with the History API, so this is all a view change takes.
  const go = useCallback((next: PeopleView, mode: "push" | "replace" = "push") => {
    const href = viewHref(next);
    if (href === `${window.location.pathname}${window.location.search}`) return;
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", href);
  }, []);

  /** Throw away the current feed and fetch it again. */
  function reload() {
    setFeeds((f) => {
      const rest = { ...f };
      delete rest[key];
      return rest;
    });
  }

  function retry() {
    setFailed((x) => {
      const rest = { ...x };
      delete rest[key];
      return rest;
    });
  }

  async function loadMore() {
    const entry = feeds[key];
    if (!entry?.next || entry.more === "loading") return;
    const k = key;
    const cursor = entry.next;
    setFeeds((f) => ({ ...f, [k]: { ...f[k], more: "loading" } }));
    const r = await api<{ moments: MomentT[]; next: string | null }>(`/api/moments?${feedQuery(view, cursor)}`);
    setFeeds((f) => {
      const cur = f[k];
      if (!cur) return f;
      return r.ok
        ? { ...f, [k]: { ...cur, moments: unique([...cur.moments, ...r.data.moments]), next: r.data.next, more: undefined } }
        : { ...f, [k]: { ...cur, more: "failed" } };
    });
  }

  function onShared(m: MomentT) {
    setFeeds((f) => {
      const out: Record<string, FeedEntry> = {};
      for (const [k, entry] of Object.entries(f)) {
        const [tab, tag] = k.split("|");
        out[k] = tab === "following" && (!tag || m.tags.includes(tag)) ? { ...entry, moments: unique([m, ...entry.moments]) } : entry;
      }
      return out;
    });
    setFresh(m._id);
    if (view.tab !== "following" || view.tag) go(EMPTY_VIEW);
  }

  function onDeleted(id: string) {
    setFeeds((f) => Object.fromEntries(Object.entries(f).map(([k, e]) => [k, { ...e, moments: e.moments.filter((m) => m._id !== id) }])));
  }

  // One person can show up in several places; a follow anywhere shows everywhere.
  function onFollow(p: FollowEvent) {
    setRels((r) => ({
      ...r,
      [p.handle]: { isFollowing: p.isFollowing, followsYou: p.followsYou, followerCount: p.followerCount, was: r[p.handle]?.was ?? !p.isFollowing },
    }));
    setFeeds((f) => Object.fromEntries(Object.entries(f).map(([k, e]) => [k, k.startsWith("following|") ? { ...e, stale: true } : e])));
  }

  const withRel = useMemo(() => {
    return (p: PersonT): PersonT => {
      const r = rels[p.handle];
      return r ? { ...p, isFollowing: r.isFollowing, followsYou: r.followsYou, followerCount: r.followerCount ?? p.followerCount } : p;
    };
  }, [rels]);
  const people = useMemo(() => suggested.map(withRel), [suggested, withRel]);
  const followingDelta = Object.values(rels).reduce((n, r) => n + (r.isFollowing ? 1 : 0) - (r.was ? 1 : 0), 0);

  // Keep the last results on screen (dimmed) while a new search loads.
  const currentFind = finds[key];
  const [lastFind, setLastFind] = useState<PersonT[] | null>(currentFind ?? null);
  if (currentFind && currentFind !== lastFind) setLastFind(currentFind);
  const shownFind = currentFind ?? lastFind;
  const results = useMemo(() => shownFind?.map(withRel) ?? null, [shownFind, withRel]);

  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.tab === view.tab);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const to = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : step ? (i + step + TABS.length) % TABS.length : -1;
    if (to < 0) return;
    e.preventDefault();
    switchTab(TABS[to].tab);
    tabs.current[to]?.focus();
  }
  function switchTab(tab: PeopleTab) {
    if (tab === view.tab) return;
    // The topic carries over between the feeds and people; a search stays with Find people.
    go({ tab, tag: view.tag, q: "", role: "" });
  }

  const current = TABS.find((t) => t.tab === view.tab)!;

  return (
    <div className="mt-[clamp(1.75rem,4vw,2.75rem)] grid grid-cols-1 gap-x-8 gap-y-10 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-7">
        <Composer me={me} onShared={onShared} />

        <div className="mt-10">
          <div
            role="tablist"
            aria-label="What to show"
            onKeyDown={onTabKey}
            className="scale"
          >
            {TABS.map((t, i) => (
              <button
                key={t.tab}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`people-tab-${t.tab}`}
                type="button"
                role="tab"
                aria-selected={view.tab === t.tab}
                aria-controls="people-panel"
                tabIndex={view.tab === t.tab ? 0 : -1}
                onClick={() => switchTab(t.tab)}
                className="scale-step scale-row min-h-12 px-2 text-[0.9375rem] focus-visible:-outline-offset-4"
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.875rem] text-ink/65">{current.blurb}</p>
        </div>

        <div id="people-panel" role="tabpanel" aria-labelledby={`people-tab-${view.tab}`} className="mt-6">
          {view.tab === "find" ? (
            <FindPanel
              view={view}
              go={go}
              facets={facets}
              results={results}
              loading={!currentFind && !failed[key]}
              failed={Boolean(failed[key])}
              retry={retry}
              suggested={people}
              onFollow={onFollow}
            />
          ) : (
            <FeedPanel
              view={view}
              go={go}
              entry={feeds[key]}
              failed={Boolean(failed[key])}
              retry={retry}
              loadMore={loadMore}
              reload={reload}
              fresh={fresh}
              suggested={people}
              rels={rels}
              onFollow={onFollow}
              onDeleted={onDeleted}
            />
          )}
        </div>
      </div>

      <aside className="hidden min-w-0 xl:col-span-5 xl:block" aria-label="You and people to follow">
        <div className="space-y-6">
          <YouCard me={me} followingDelta={followingDelta} />
          {people.length ? (
            <section aria-labelledby="follow-heading" className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="follow-heading" className="font-display text-display-s">
                  People to follow
                </h2>
                <button
                  type="button"
                  onClick={() => go({ ...EMPTY_VIEW, tab: "find" })}
                  className="link inline-flex min-h-11 shrink-0 items-center text-[0.875rem] font-semibold"
                >
                  Find more
                </button>
              </div>
              <p className="text-[0.875rem] text-ink/65">Picked from your role and interests.</p>
              <ul className="mt-2">
                {people.slice(0, 5).map((p) => (
                  <li key={p.handle} className="rule border-t-2 first:border-t-0">
                    <PersonCard person={p} compact onChange={onFollow} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {facets.topics.length ? (
            <section aria-labelledby="topics-heading" className="card p-5">
              <h2 id="topics-heading" className="font-display text-display-s">
                Topics
              </h2>
              <p className="mt-1 text-[0.875rem] text-ink/65">Tags on public moments this month.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {facets.topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={view.tab !== "find" && view.tag === t}
                    onClick={() =>
                      go({ ...EMPTY_VIEW, tab: view.tab === "find" ? "discover" : view.tab, tag: view.tab !== "find" && view.tag === t ? "" : t })
                    }
                    className="chip chip-sm"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function YouCard({ me, followingDelta }: { me: PeopleMe; followingDelta: number }) {
  const router = useRouter();
  const handle = useViewerHandle();
  const [claiming, setClaiming] = useState(false);
  return (
    <section aria-labelledby="you-heading" data-hue={hue8(me.hue)} className="card bg-tint p-5">
      <div className="flex items-center gap-4">
        <Avatar name={me.name} hue={me.hue} size={64} className="-rotate-3 shadow-sticker-sm" />
        <div className="min-w-0">
          <h2 id="you-heading" className="truncate font-display text-[1.7rem] leading-none tracking-[-0.03em]">
            {me.name}
          </h2>
          <p className="mt-1.5 truncate text-[0.875rem] font-semibold text-deep">{handle ? `@${handle}` : "No handle yet"}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        {(
          [
            ["Followers", me.followerCount],
            ["Following", Math.max(0, me.followingCount + followingDelta)],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="flex flex-col-reverse rounded-md border-2 border-edge bg-surface px-4 py-3">
            <dt className="text-[0.8125rem] font-medium text-ink/70">{label}</dt>
            <dd className="font-display text-[2.1rem] leading-none tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      {handle ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4">
          <Link href={`/u/${handle}`} className="link inline-flex min-h-11 items-center text-[0.9375rem] font-semibold">
            Your profile
          </Link>
          <Link href="/settings#profile" className="inline-flex min-h-11 items-center text-[0.875rem] font-medium text-ink/75 hover:text-ink">
            Edit profile
          </Link>
        </div>
      ) : claiming ? (
        <HandleClaim
          className="mt-4"
          purpose="for your profile"
          onCancel={() => setClaiming(false)}
          onClaimed={() => {
            setClaiming(false);
            router.refresh();
          }}
        />
      ) : (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setClaiming(true)} className="w-full">
            <Icon name="at" className="h-4 w-4" />
            Pick a handle
          </Button>
          <p className="mt-2 text-[0.8125rem] text-ink/65">You need one to follow, react, reply and share.</p>
        </div>
      )}
      {!me.isPublic ? (
        <p className="mt-4 flex gap-2 border-t-2 border-edge/15 pt-4 text-[0.8125rem] text-ink/75">
          <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Unlisted: only someone who types your whole handle can find you.{" "}
            <Link href="/settings#profile" className="link font-semibold text-ink">
              Change
            </Link>
          </span>
        </p>
      ) : null}
    </section>
  );
}

function FeedPanel({
  view,
  go,
  entry,
  failed,
  retry,
  loadMore,
  reload,
  fresh,
  suggested,
  rels,
  onFollow,
  onDeleted,
}: {
  view: PeopleView;
  go: (v: PeopleView) => void;
  entry: FeedEntry | undefined;
  failed: boolean;
  retry: () => void;
  loadMore: () => void;
  reload: () => void;
  fresh: string | null;
  suggested: PersonT[];
  rels: Record<string, Rel>;
  onFollow: (p: FollowEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const discover = view.tab === "discover";
  const filter = view.tag ? (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-[0.875rem] text-ink/70">Showing moments tagged</span>
      <button
        type="button"
        aria-pressed
        aria-label={`#${view.tag}, clear the tag`}
        onClick={() => go({ ...view, tag: "" })}
        className="chip chip-sm min-h-11 lg:min-h-9"
      >
        #{view.tag}
        <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    </div>
  ) : null;

  if (failed && !entry) {
    return (
      <>
        {filter}
        <Problem retry={retry}>The moments didn’t load.</Problem>
      </>
    );
  }
  if (!entry) {
    return (
      <>
        {filter}
        <FeedSkeleton />
      </>
    );
  }

  if (!entry.moments.length) {
    return (
      <>
        {filter}
        {view.tag ? (
          <Empty
            title={discover ? `No public moments tagged #${view.tag} this month.` : `Nothing tagged #${view.tag} from you or the people you follow.`}
            actions={
              <>
                <Button variant="secondary" onClick={() => go({ ...view, tag: "" })}>
                  Clear the tag
                </Button>
                {discover ? null : (
                  <Button variant="quiet" onClick={() => go({ ...view, tab: "discover" })}>
                    Look in Discover
                    <Icon name="arrow" className="h-4 w-4" />
                  </Button>
                )}
              </>
            }
          />
        ) : discover ? (
          <Empty
            title="Nothing new to discover right now."
            body="Public moments from people you don’t follow show up here. You can also look people up by name."
            actions={
              <Button variant="secondary" onClick={() => go({ ...EMPTY_VIEW, tab: "find" })}>
                Find people
              </Button>
            }
          />
        ) : (
          <FollowingEmpty suggested={suggested} entry={entry} go={go} reload={reload} onFollow={onFollow} />
        )}
      </>
    );
  }

  return (
    <>
      {filter}
      <ol className="grid grid-cols-1 gap-5" aria-label={discover ? "Discover" : "Following"}>
        {entry.moments.map((m, i) => (
          <li key={m._id} className={m._id === fresh ? "appear" : undefined}>
            <MomentCard
              moment={m}
              followable={discover ? (rels[m.author.handle] ?? true) : false}
              onFollow={onFollow}
              onTag={(tag) => go({ ...view, tag })}
              onDelete={onDeleted}
            />
            {!discover && !view.tag && i === 2 && suggested.length ? <SuggestedStrip people={suggested} onFollow={onFollow} /> : null}
          </li>
        ))}
      </ol>
      {!discover && !view.tag && entry.moments.length < 3 && suggested.length ? <SuggestedStrip people={suggested} onFollow={onFollow} /> : null}
      <div className="mt-8 flex flex-col items-center gap-2">
        {entry.next ? (
          <Button variant="secondary" onClick={loadMore} disabled={entry.more === "loading"} className="min-w-40">
            {entry.more === "loading" ? "Loading…" : "Load more"}
          </Button>
        ) : (
          <p className="text-[0.875rem] text-ink/65">{entry.moments.length > 3 ? "That’s everything for now." : null}</p>
        )}
        {entry.more === "failed" ? (
          <p role="alert" className="text-[0.875rem] font-medium text-bad">
            That didn’t load. Try again.
          </p>
        ) : null}
      </div>
    </>
  );
}

function FollowingEmpty({
  suggested,
  entry,
  go,
  reload,
  onFollow,
}: {
  suggested: PersonT[];
  entry: FeedEntry;
  go: (v: PeopleView) => void;
  reload: () => void;
  onFollow: (p: FollowEvent) => void;
}) {
  return (
    <div>
      <Empty
        title="Your feed fills up as you follow people."
        body={
          suggested.length
            ? "Their wins, ships and questions land here, newest first. A few people to start with:"
            : "Their wins, ships and questions land here, newest first."
        }
        actions={
          entry.stale ? (
            <Button variant="secondary" onClick={reload}>
              Show their moments
              <Icon name="arrow-down" className="h-4 w-4" />
            </Button>
          ) : suggested.length ? null : (
            <Button variant="secondary" onClick={() => go({ ...EMPTY_VIEW, tab: "find" })}>
              Find people
            </Button>
          )
        }
      />
      {suggested.length ? (
        <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {suggested.map((p) => (
            <li key={p.handle}>
              <PersonCard person={p} onChange={onFollow} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SuggestedStrip({ people, onFollow }: { people: PersonT[]; onFollow: (p: FollowEvent) => void }) {
  return (
    <section aria-label="People to follow" className="mt-5 xl:hidden">
      <h2 className="font-display text-display-s">People to follow</h2>
      <ul className="no-scrollbar -mx-margin mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-margin pb-3 pt-1">
        {people.map((p) => (
          <li key={p.handle} className="w-[min(18rem,78vw)] shrink-0 snap-start scroll-ml-margin">
            <PersonCard person={p} onChange={onFollow} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FindPanel({
  view,
  go,
  facets,
  results,
  loading,
  failed,
  retry,
  suggested,
  onFollow,
}: {
  view: PeopleView;
  go: (v: PeopleView, mode?: "push" | "replace") => void;
  facets: PeopleFacets;
  results: PersonT[] | null;
  loading: boolean;
  failed: boolean;
  retry: () => void;
  suggested: PersonT[];
  onFollow: (p: FollowEvent) => void;
}) {
  // What's typed runs ahead of the URL; the URL follows once typing pauses.
  const [query, setQuery] = useState(view.q);
  const [written, setWritten] = useState(view.q);
  const [urlQ, setUrlQ] = useState(view.q);
  if (view.q !== urlQ) {
    setUrlQ(view.q);
    if (view.q !== written) {
      setQuery(view.q);
      setWritten(view.q);
    }
  }
  useEffect(() => {
    const q = query.trim().slice(0, 40);
    if (q === view.q) return;
    const t = window.setTimeout(() => {
      setWritten(q);
      go({ ...view, q }, "replace");
    }, 300);
    return () => window.clearTimeout(t);
  }, [query, view, go]);

  const filtered = Boolean(view.q || view.role || view.tag);
  const roles = view.role && !facets.roles.some((r) => r.toLowerCase() === view.role.toLowerCase()) ? [view.role, ...facets.roles] : facets.roles;
  const interests = view.tag && !facets.interests.includes(view.tag) ? [view.tag, ...facets.interests] : facets.interests;
  const suggestedHandles = new Set(suggested.map((p) => p.handle));
  const rest = results ? (filtered ? results : results.filter((p) => !suggestedHandles.has(p.handle))) : null;

  return (
    <div>
      <div className="relative">
        <label htmlFor="people-search" className="sr-only">
          Search people by name or handle
        </label>
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/55" />
        <input
          id="people-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or @handle"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="control pl-12"
        />
      </div>

      {roles.length ? (
        <ChipRow label="Role">
          {roles.map((r) => {
            const on = view.role.toLowerCase() === r.toLowerCase();
            return (
              <button key={r} type="button" aria-pressed={on} onClick={() => go({ ...view, role: on ? "" : r })} className="chip chip-sm min-h-11 shrink-0 lg:min-h-9">
                {r}
              </button>
            );
          })}
        </ChipRow>
      ) : null}
      {interests.length ? (
        <ChipRow label="Into">
          {interests.map((t) => {
            const on = view.tag === t;
            return (
              <button key={t} type="button" aria-pressed={on} onClick={() => go({ ...view, tag: on ? "" : t })} className="chip chip-sm min-h-11 shrink-0 lg:min-h-9">
                #{t}
              </button>
            );
          })}
        </ChipRow>
      ) : null}

      <div className="mt-7" aria-busy={loading}>
        {failed && !results ? (
          <Problem retry={retry}>People didn’t load.</Problem>
        ) : !results ? (
          <PeopleSkeleton />
        ) : (
          <div className={`transition-opacity duration-300 ${loading ? "opacity-55" : ""}`}>
            {!filtered && suggested.length ? (
              <section aria-labelledby="suggested-heading" className="mb-10">
                <h2 id="suggested-heading" className="font-display text-display-s">
                  Suggested for you
                </h2>
                <p className="mt-1 text-[0.875rem] text-ink/65">People who share your role or interests, then the most followed.</p>
                <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {suggested.map((p) => (
                    <li key={p.handle}>
                      <PersonCard person={p} onChange={onFollow} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {rest && rest.length ? (
              <section aria-labelledby="results-heading">
                <h2 id="results-heading" className="font-display text-display-s" aria-live="polite">
                  {filtered ? plural(rest.length, "person", "people") : "Everyone listed"}
                </h2>
                {filtered ? null : <p className="mt-1 text-[0.875rem] text-ink/65">Most followed first.</p>}
                <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {rest.map((p) => (
                    <li key={p.handle}>
                      <PersonCard person={p} onChange={onFollow} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : filtered ? (
              <Empty
                title={view.q ? `No one matches “${view.q}”.` : "No one matches those filters."}
                body="Someone unlisted only shows up when you type their whole handle."
                actions={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setWritten("");
                      go({ ...EMPTY_VIEW, tab: "find" });
                    }}
                  >
                    Clear the search
                  </Button>
                }
              />
            ) : !suggested.length ? (
              <Empty title="No one is listed yet." body="When people make their profiles public, you can find them here." />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="mt-4 flex items-start gap-3">
      <p aria-hidden className="w-10 shrink-0 pt-3 text-[0.8125rem] font-semibold text-ink/70 lg:pt-2">
        {label}
      </p>
      <div className="no-scrollbar -mr-margin flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2 pr-margin sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pr-0">
        {children}
      </div>
    </div>
  );
}

function Empty({ title, body, actions }: { title: string; body?: string; actions?: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-edge/45 px-5 py-10 text-center sm:px-8">
      <p className="mx-auto max-w-md font-display text-[1.6rem] leading-[1.02] tracking-[-0.03em]">{title}</p>
      {body ? <p className="mx-auto mt-3 max-w-md text-[0.9375rem] text-ink/75">{body}</p> : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}

function Problem({ retry, children }: { retry: () => void; children: ReactNode }) {
  return (
    <div role="alert" data-hue="0" className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-edge bg-tint px-4 py-3">
      <p className="font-medium text-deep">{children}</p>
      <button type="button" onClick={retry} className={buttonClass({ variant: "secondary", size: "md" })}>
        Try again
      </button>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading moments" className="grid grid-cols-1 gap-5">
      {[0, 1].map((i) => (
        <div key={i} aria-hidden className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 rounded-full bg-raised" />
            <span className="grid flex-1 gap-2">
              <span className="h-3.5 w-40 max-w-full rounded-full bg-raised" />
              <span className="h-3 w-24 rounded-full bg-raised" />
            </span>
          </div>
          <span className="mt-5 block h-4 w-11/12 rounded-full bg-raised" />
          <span className="mt-2.5 block h-4 w-2/3 rounded-full bg-raised" />
          <span className="mt-6 block h-11 rounded-[18px] bg-raised" />
        </div>
      ))}
    </div>
  );
}

function PeopleSkeleton() {
  return (
    <ul role="status" aria-label="Loading people" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} aria-hidden className="card h-48 p-5">
          <div className="flex items-center gap-4">
            <span className="h-14 w-14 rounded-full bg-raised" />
            <span className="grid flex-1 gap-2">
              <span className="h-4 w-32 max-w-full rounded-full bg-raised" />
              <span className="h-3 w-20 rounded-full bg-raised" />
            </span>
          </div>
          <span className="mt-5 block h-3.5 w-full rounded-full bg-raised" />
          <span className="mt-2 block h-3.5 w-3/4 rounded-full bg-raised" />
        </li>
      ))}
    </ul>
  );
}
