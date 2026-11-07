import type { QueryFilter, Types } from "mongoose";
import { Follow } from "@/lib/db/models/Follow";
import { Moment, type IMoment } from "@/lib/db/models/Moment";
import { isObjectId, objectId } from "./db";

/*
 * Who sees a moment: its author, always. Anyone signed in, if it's public. The author's friends
 * (people they follow who follow them back), if it's friends-only. `canSeeMoment` checks one
 * moment and `visibleTo` is the same rule as a query clause; every route goes through one of them.
 */

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const links = await Follow.countDocuments({
    $or: [
      { followerId: a, followeeId: b },
      { followerId: b, followeeId: a },
    ],
  });
  return links === 2;
}

export async function canSeeMoment(
  viewerId: string,
  moment: Pick<IMoment, "userId" | "visibility">
): Promise<boolean> {
  const authorId = String(moment.userId);
  if (moment.visibility === "public" || authorId === viewerId) return true;
  return areFriends(viewerId, authorId);
}

/** The moment if the viewer may see it. Null for missing and hidden alike, so both answer 404. */
export async function findVisibleMoment(viewerId: string, momentId: string) {
  if (!isObjectId(momentId)) return null;
  const moment = await Moment.findById(momentId).lean();
  if (!moment || !(await canSeeMoment(viewerId, moment))) return null;
  return moment;
}

/**
 * Query form of the rule. `friendIds` must be the viewer's friends among the authors being
 * queried (or all of them); friends-only moments by anyone else stay out.
 */
export function visibleTo(viewerId: string, friendIds: Types.ObjectId[]): QueryFilter<IMoment> {
  return {
    $or: [{ visibility: "public" }, { userId: { $in: [objectId(viewerId), ...friendIds] } }],
  };
}

/** Everyone the viewer follows. */
export async function followingIds(viewerId: string): Promise<Types.ObjectId[]> {
  return Follow.distinct("followeeId", { followerId: viewerId });
}

/** Those of `ids` (people the viewer follows) who follow back. */
export async function friendsAmong(viewerId: string, ids: Types.ObjectId[]): Promise<Types.ObjectId[]> {
  if (!ids.length) return [];
  return Follow.distinct("followerId", { followerId: { $in: ids }, followeeId: viewerId });
}

export interface Relation {
  isFollowing: boolean;
  followsYou: boolean;
  /** One of the viewer's people. */
  isClose: boolean;
  isMe: boolean;
}

/** The viewer's relation to each of `ids`, in two queries. */
export async function relationsTo(
  viewerId: string,
  ids: Types.ObjectId[]
): Promise<(id: Types.ObjectId) => Relation> {
  const [following, followers] = ids.length
    ? await Promise.all([
        Follow.find({ followerId: viewerId, followeeId: { $in: ids } }).select("followeeId close").lean(),
        Follow.distinct("followerId", { followerId: { $in: ids }, followeeId: viewerId }),
      ])
    : [[], []];
  const out = new Map(following.map((f) => [String(f.followeeId), Boolean(f.close)]));
  const back = new Set(followers.map(String));
  return (id) => ({
    isFollowing: out.has(String(id)),
    followsYou: back.has(String(id)),
    isClose: out.get(String(id)) === true,
    isMe: String(id) === viewerId,
  });
}

/**
 * The viewer's people: the ones they picked, or everyone they follow until they pick any. Their
 * People feed and home show these; everyone else is found by name.
 */
export async function yourPeople(viewerId: string): Promise<{ ids: Types.ObjectId[]; chosen: boolean }> {
  const follows = await Follow.find({ followerId: viewerId }).select("followeeId close").lean();
  const close = follows.filter((f) => f.close).map((f) => f.followeeId);
  return close.length ? { ids: close, chosen: true } : { ids: follows.map((f) => f.followeeId), chosen: false };
}
