import type { Types } from "mongoose";
import { User, type IUser } from "@/lib/db/models/User";
import { Moment, REACTION_KINDS, type IMoment, type ReactionKind } from "@/lib/db/models/Moment";
import { Reaction } from "@/lib/db/models/Reaction";
import type { IReply } from "@/lib/db/models/Reply";
import type { INotification } from "@/lib/db/models/Notification";
import type { MomentT, NotificationT, PersonT, ReplyT } from "@/lib/types";
import { relationsTo, type Relation } from "./visibility";

/** Everything read from a user to show them to someone else: never email, timezone or pages. */
export const PERSON_FIELDS = "handle name bio role hue followerCount followingCount";
const AUTHOR_FIELDS = "handle name role hue";

type PersonDoc = Pick<
  IUser,
  "_id" | "handle" | "name" | "bio" | "role" | "hue" | "followerCount" | "followingCount"
>;
type AuthorDoc = Pick<IUser, "_id" | "handle" | "name" | "role" | "hue">;
type MomentDoc = Pick<
  IMoment,
  "_id" | "userId" | "text" | "kind" | "tags" | "threadTitle" | "visibility" | "reactions" | "replyCount" | "createdAt"
>;
type ReplyDoc = Pick<IReply, "_id" | "userId" | "text" | "createdAt">;
type NotificationDoc = Pick<INotification, "_id" | "actorId" | "kind" | "momentId" | "reaction" | "read" | "createdAt">;
type Named<T> = T & { handle: string };

/** People without a handle have no public presence, so they never appear in what others see. */
function named<T extends { handle: string | null }>(user: T): user is Named<T> {
  return typeof user.handle === "string";
}

/** Accounts from before `hue` existed get a stable one from their id, not a random default per read. */
export function hueOf(user: { _id: Types.ObjectId; hue?: number }): number {
  return typeof user.hue === "number" ? user.hue : parseInt(String(user._id).slice(-2), 16) % 8;
}

export function reactionCounts(reactions: Partial<Record<ReactionKind, number>> | undefined) {
  return {
    nice: reactions?.nice ?? 0,
    same: reactions?.same ?? 0,
    go: reactions?.go ?? 0,
    hug: reactions?.hug ?? 0,
  } satisfies Record<ReactionKind, number>;
}

export function toPerson(user: Named<PersonDoc>, rel: Relation): PersonT {
  return {
    handle: user.handle,
    name: user.name,
    bio: user.bio ?? "",
    role: user.role,
    hue: hueOf(user),
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
    isFollowing: rel.isFollowing,
    followsYou: rel.followsYou,
    isMe: rel.isMe,
  };
}

/** The signed-in writer's own profile: a PersonT that may not have a handle yet, plus their settings. */
export type ProfileT = Omit<PersonT, "handle"> & {
  handle: string | null;
  isPublic: boolean;
  interests: string[];
  /** Only while `handle` is null. */
  suggestedHandle?: string;
};

export function toProfile(
  user: PersonDoc & Pick<IUser, "isPublic" | "interests">,
  suggestedHandle?: string
): ProfileT {
  return {
    handle: user.handle ?? null,
    name: user.name,
    bio: user.bio ?? "",
    role: user.role,
    hue: hueOf(user),
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
    isFollowing: false,
    followsYou: false,
    isMe: true,
    isPublic: user.isPublic ?? false,
    interests: user.interests ?? [],
    ...(suggestedHandle ? { suggestedHandle } : {}),
  };
}

export function toMoment(
  moment: MomentDoc,
  author: Named<AuthorDoc>,
  viewerId: string,
  mine: ReactionKind[]
): MomentT {
  return {
    _id: String(moment._id),
    author: { handle: author.handle, name: author.name, hue: hueOf(author), role: author.role },
    text: moment.text,
    kind: moment.kind,
    tags: moment.tags ?? [],
    threadTitle: moment.threadTitle ?? null,
    visibility: moment.visibility,
    reactions: reactionCounts(moment.reactions),
    mine,
    replyCount: moment.replyCount ?? 0,
    isMine: String(moment.userId) === viewerId,
    createdAt: moment.createdAt.toISOString(),
  };
}

export function toReply(reply: ReplyDoc, author: Named<AuthorDoc>, viewerId: string): ReplyT {
  return {
    _id: String(reply._id),
    author: { handle: author.handle, name: author.name, hue: hueOf(author) },
    text: reply.text,
    isMine: String(reply.userId) === viewerId,
    createdAt: reply.createdAt.toISOString(),
  };
}

export function toNotification(
  notification: NotificationDoc,
  actor: Named<AuthorDoc>,
  momentText: string | null
): NotificationT {
  return {
    _id: String(notification._id),
    kind: notification.kind,
    actor: { handle: actor.handle, name: actor.name, hue: hueOf(actor) },
    momentId: notification.momentId ? String(notification.momentId) : null,
    momentText,
    reaction: notification.reaction ?? null,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

async function authorsById(ids: Types.ObjectId[]): Promise<Map<string, Named<AuthorDoc>>> {
  if (!ids.length) return new Map();
  const users = await User.find({ _id: { $in: ids } }).select(AUTHOR_FIELDS).lean();
  return new Map(users.filter(named).map((u) => [String(u._id), u]));
}

export async function peopleFor(viewerId: string, users: PersonDoc[]): Promise<PersonT[]> {
  const listed = users.filter(named);
  const rel = await relationsTo(viewerId, listed.map((u) => u._id));
  return listed.map((u) => toPerson(u, rel(u._id)));
}

export async function personFor(viewerId: string, userId: Types.ObjectId): Promise<PersonT | null> {
  const user = await User.findById(userId).select(PERSON_FIELDS).lean();
  if (!user) return null;
  const [person] = await peopleFor(viewerId, [user]);
  return person ?? null;
}

export async function momentsFor(viewerId: string, moments: MomentDoc[]): Promise<MomentT[]> {
  if (!moments.length) return [];
  const [authors, given] = await Promise.all([
    authorsById(moments.map((m) => m.userId)),
    Reaction.find({ momentId: { $in: moments.map((m) => m._id) }, userId: viewerId })
      .select("momentId kind")
      .lean(),
  ]);
  const mine = new Map<string, Set<ReactionKind>>();
  for (const r of given) {
    const key = String(r.momentId);
    mine.set(key, (mine.get(key) ?? new Set<ReactionKind>()).add(r.kind));
  }
  return moments.flatMap((m) => {
    const author = authors.get(String(m.userId));
    const kinds = mine.get(String(m._id));
    return author ? [toMoment(m, author, viewerId, REACTION_KINDS.filter((k) => kinds?.has(k)))] : [];
  });
}

export async function repliesFor(viewerId: string, replies: ReplyDoc[]): Promise<ReplyT[]> {
  const authors = await authorsById(replies.map((r) => r.userId));
  return replies.flatMap((r) => {
    const author = authors.get(String(r.userId));
    return author ? [toReply(r, author, viewerId)] : [];
  });
}

export async function notificationsFor(items: NotificationDoc[]): Promise<NotificationT[]> {
  const momentIds = items.flatMap((n) => (n.momentId ? [n.momentId] : []));
  const [actors, moments] = await Promise.all([
    authorsById(items.map((n) => n.actorId)),
    momentIds.length ? Moment.find({ _id: { $in: momentIds } }).select("text").lean() : [],
  ]);
  const texts = new Map(moments.map((m) => [String(m._id), m.text]));
  return items.flatMap((n) => {
    const actor = actors.get(String(n.actorId));
    const momentText = n.momentId ? texts.get(String(n.momentId)) : null;
    // A moment that has since been deleted takes its notifications with it.
    return actor && momentText !== undefined ? [toNotification(n, actor, momentText)] : [];
  });
}
