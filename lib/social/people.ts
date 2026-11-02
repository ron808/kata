import type { QueryFilter } from "mongoose";
import { User, type IUser } from "@/lib/db/models/User";
import { roleKeyOf } from "@/lib/questions/daily";
import { ROLE_PRESETS } from "@/lib/roles";
import type { PersonT } from "@/lib/types";
import { objectId } from "./db";
import { PERSON_FIELDS, peopleFor } from "./dto";
import { followingIds } from "./visibility";

const SEARCH_LIMIT = 50;
const SUGGESTED = 6;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive whole-value match; interests may not all have been stored lowercase. */
function exactly(text: string): RegExp {
  return new RegExp(`^${escapeRegex(text)}$`, "i");
}

const presetFor = (role: string) => {
  const key = roleKeyOf(role);
  return key === "custom" ? null : ROLE_PRESETS.find((p) => p.key === key) ?? null;
};

/** Every stored spelling of a role: sign-up saved "Founder", onboarding saves "Founder / CEO". */
function roleNames(role: string): RegExp[] {
  const preset = presetFor(role);
  const names = preset ? [preset.name, preset.name.split("/")[0].trim(), preset.key.replace(/_/g, " ")] : [role.replace(/_/g, " ")];
  return [...new Set(names)].map(exactly);
}

/** The name a role goes by in filters: a preset's short name, or the person's own words. */
export function roleLabel(role: string): string {
  return presetFor(role)?.name.split("/")[0].trim() ?? role;
}

function sameRole(a: string | undefined, b: string): boolean {
  if (!a) return false;
  const preset = presetFor(b);
  return preset ? presetFor(a)?.key === preset.key : a.toLowerCase() === b.toLowerCase();
}

/** Only people who list themselves publicly, and only once they have a handle to be found by. */
const listed = (viewerId: string): QueryFilter<IUser> => ({
  isPublic: true,
  handle: { $type: "string" },
  _id: { $ne: objectId(viewerId) },
});

export interface PeopleFilters {
  /** Start of the handle, or of any word of the name. */
  q?: string;
  /** A role ("Developer", "job_seeker", "Founder / CEO"); every spelling of the same role matches. */
  role?: string;
  /** One of their interests. */
  tag?: string;
}

export async function discoverPeople(
  viewerId: string,
  { q, role, tag }: PeopleFilters = {}
): Promise<PersonT[]> {
  const filter = listed(viewerId);
  const handle = q ? escapeRegex(q.replace(/^@/, "").toLowerCase()) : "";
  if (q && handle) {
    filter.$or = [
      { handle: { $regex: `^${handle}` } },
      { name: { $regex: `(?:^|\\s)${escapeRegex(q)}`, $options: "i" } },
    ];
  }
  if (role) filter.role = { $in: roleNames(role) };
  if (tag) filter.interests = exactly(tag);

  // Their exact handle finds them even unlisted: that's why they picked one.
  const exact = q && handle && !role && !tag ? { handle: q.replace(/^@/, "").toLowerCase(), _id: { $ne: objectId(viewerId) } } : null;
  const users = await User.find(exact ? { $or: [filter, exact] } : filter)
    .select(PERSON_FIELDS)
    .sort({ followerCount: -1, _id: 1 })
    .limit(SEARCH_LIMIT)
    .lean();
  return peopleFor(viewerId, users);
}

/**
 * Up to six listed people you don't follow yet: those who share your role or interests first
 * (most in common, then most followed), topped up with the most followed.
 */
export async function suggestedPeople(viewerId: string): Promise<PersonT[]> {
  const [me, followees] = await Promise.all([
    User.findById(viewerId).select("role interests").lean(),
    followingIds(viewerId),
  ]);
  const base: QueryFilter<IUser> = { ...listed(viewerId), _id: { $nin: [objectId(viewerId), ...followees] } };
  // "Custom" means no role was picked, which isn't something to have in common.
  const role = me?.role && me.role !== "Custom" ? me.role : null;
  const interests = [...new Set((me?.interests ?? []).map((i) => i.toLowerCase()))];

  const common: QueryFilter<IUser>[] = [];
  if (role) common.push({ role: { $in: roleNames(role) } });
  if (interests.length) common.push({ interests: { $in: interests.map(exactly) } });

  const alike = common.length
    ? await User.find({ ...base, $or: common })
        .select(`${PERSON_FIELDS} interests`)
        .sort({ followerCount: -1, _id: 1 })
        .limit(SEARCH_LIMIT)
        .lean()
    : [];
  const inCommon = (u: (typeof alike)[number]) =>
    (role && sameRole(u.role, role) ? 1 : 0) + (u.interests ?? []).filter((i) => interests.includes(i.toLowerCase())).length;
  const picks = alike
    .map((u) => ({ u, n: inCommon(u) }))
    .sort((a, b) => b.n - a.n || (b.u.followerCount ?? 0) - (a.u.followerCount ?? 0))
    .slice(0, SUGGESTED)
    .map(({ u }) => u);

  if (picks.length < SUGGESTED) {
    const more = await User.find({
      ...base,
      _id: { $nin: [objectId(viewerId), ...followees, ...picks.map((u) => u._id)] },
    })
      .select(PERSON_FIELDS)
      .sort({ followerCount: -1, _id: 1 })
      .limit(SUGGESTED - picks.length)
      .lean();
    picks.push(...more);
  }
  return peopleFor(viewerId, picks);
}
