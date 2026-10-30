// The /people view as it lives in the URL, shared by the server page and the client:
//   /people                         Following
//   /people?tab=discover&tag=books  Discover, moments tagged #books
//   /people?tab=find&q=mi&role=Designer&tag=typography
// `tag` is a topic: moments with that tag on the feeds, people with that interest on Find people.

export type PeopleTab = "following" | "discover" | "find";

export interface PeopleView {
  tab: PeopleTab;
  tag: string;
  /** Find people only. */
  q: string;
  /** Find people only. */
  role: string;
}

type RawParams = { get(key: string): string | null } | Record<string, string | string[] | undefined>;

function read(raw: RawParams, key: string): string {
  if (typeof (raw as { get?: unknown }).get === "function") return (raw as { get(key: string): string | null }).get(key) ?? "";
  const value = (raw as Record<string, string | string[] | undefined>)[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The way tags are stored: lowercase, no #, single spaces (as lib/social/schemas normalizeTag). */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 32);
}

export function parseView(raw: RawParams): PeopleView {
  const t = read(raw, "tab");
  const tab: PeopleTab = t === "discover" || t === "find" ? t : "following";
  return {
    tab,
    tag: normalizeTag(read(raw, "tag")),
    q: tab === "find" ? read(raw, "q").trim().slice(0, 40) : "",
    role: tab === "find" ? read(raw, "role").trim().slice(0, 40) : "",
  };
}

export function viewHref(view: PeopleView): string {
  const p = new URLSearchParams();
  if (view.tab !== "following") p.set("tab", view.tab);
  if (view.tab === "find" && view.q) p.set("q", view.q);
  if (view.tab === "find" && view.role) p.set("role", view.role);
  if (view.tag) p.set("tag", view.tag);
  const search = p.toString();
  return search ? `/people?${search}` : "/people";
}

/** One cache entry per distinct result set. */
export function viewKey(view: PeopleView): string {
  return view.tab === "find"
    ? `find|${view.q.replace(/^@/, "").toLowerCase()}|${view.role.toLowerCase()}|${view.tag}`
    : `${view.tab}|${view.tag}`;
}

/** Where a tag on a moment leads when there's no feed on the page to filter in place. */
export const tagHref = (tag: string) => viewHref({ tab: "discover", tag, q: "", role: "" });
