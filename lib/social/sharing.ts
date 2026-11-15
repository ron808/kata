import { Types } from "mongoose";
import { Conversation, conversationKey } from "@/lib/db/models/Conversation";
import { Follow } from "@/lib/db/models/Follow";
import { REACTION_KINDS, type ReactionKind } from "@/lib/db/models/Moment";
import { Notification } from "@/lib/db/models/Notification";
import { Thread, type IThread } from "@/lib/db/models/Thread";
import { COMMENT_MAX, COMMENTS_MOST, ThreadUpdate, UPDATE_MAX, type IThreadUpdate, type NoteKind } from "@/lib/db/models/ThreadUpdate";
import { User } from "@/lib/db/models/User";
import { doneToday } from "@/lib/companion/steps";
import { liveStreak } from "@/lib/companion/threads";
import { localDay, validTimeZone } from "@/lib/companion/time";
import type { FriendT, SharedRowT, SharedThreadT, ThreadUpdateT, Who } from "@/lib/types";
import { isObjectId } from "./db";
import { hueOf } from "./dto";
import { HANDLE_PATTERN, normalizeHandle } from "./handles";
import { notify, unnotify } from "./notify";

/*
 * Shared threads. A writer shares one of their threads with friends: people they follow who follow
 * them back, the same rule as messages, never across a block. Those friends see its name, where it
 * stands and everything added to it (ThreadUpdate), and add updates, comments and cheers of their
 * own; its notes, next step, tags and numbers stay the writer's, and only the writer sets where it
 * stands. Someone added later sees what's already there. Taking someone off it, or their leaving,
 * stops them seeing it at once, and what they added stays. An archived thread is the writer's alone
 * until it comes back. Maru never adds anything to one.
 */

export const SHARE_MOST = 12;
export const UPDATES_PAGE = 40;

type Outcome<T> = { ok: true; value: T } | { ok: false; error: string; status: number };
const fail = (error: string, status: number): { ok: false; error: string; status: number } => ({ ok: false, error, status });

type Doc = Pick<IThread, "_id" | "userId" | "title" | "kind" | "status" | "hue" | "dueAt" | "streak" | "lastTouchedAt" | "archived" | "with">;
const DOC = "userId title kind status hue dueAt streak lastTouchedAt archived with";
type Person = { _id: Types.ObjectId; handle?: string | null; name: string; hue?: number; timezone?: string };

const ARCHIVED = "Bring it back first: no one else sees an archived thread.";
const same = (a: unknown, b: unknown) => String(a) === String(b);
const isOn = (t: Pick<Doc, "with">, viewer: string) => t.with.some((w) => same(w, viewer));
const whoOf = (u: Person): Who => ({ handle: u.handle!, name: u.name, hue: hueOf(u) });

/** The thread if the viewer may see it as shared: their own, or shared with them and not archived. */
async function visible(viewer: string, threadId: string): Promise<Doc | null> {
  if (!isObjectId(viewer) || !isObjectId(threadId)) return null;
  const t = await Thread.findById(threadId).select(DOC).lean<Doc>();
  if (!t) return null;
  return same(t.userId, viewer) || (!t.archived && isOn(t, viewer)) ? t : null;
}

async function ownThread(viewer: string, threadId: string): Promise<Doc | null> {
  if (!isObjectId(viewer) || !isObjectId(threadId)) return null;
  return Thread.findOne({ _id: threadId, userId: viewer }).select(DOC).lean<Doc>();
}

/** Of `ids`, those with a block between them and the viewer, either way. */
async function blockedAmong(viewer: string, ids: Types.ObjectId[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const convos = await Conversation.find({ key: { $in: ids.map((id) => conversationKey(viewer, String(id))) }, "blockedBy.0": { $exists: true } })
    .select("members")
    .lean();
  return new Set(convos.flatMap((c) => c.members.map(String)).filter((id) => id !== viewer));
}

/** Of `ids`, the viewer's friends: they follow each other, with no block either way. */
async function friendsOf(viewer: string, ids: Types.ObjectId[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const [out, back, blocked] = await Promise.all([
    Follow.distinct("followeeId", { followerId: viewer, followeeId: { $in: ids } }),
    Follow.distinct("followerId", { followerId: { $in: ids }, followeeId: viewer }),
    blockedAmong(viewer, ids),
  ]);
  const backs = new Set(back.map(String));
  return new Set(out.map(String).filter((id) => backs.has(id) && !blocked.has(id)));
}

/** Everyone the viewer follows, to pick from. Only those who follow back can be picked; anyone with a block isn't listed. */
export async function shareFriends(viewer: string): Promise<FriendT[]> {
  if (!isObjectId(viewer)) return [];
  const ids = (await Follow.find({ followerId: viewer }).select("followeeId").limit(500).lean()).map((f) => f.followeeId);
  if (!ids.length) return [];
  const [back, blocked, users] = await Promise.all([
    Follow.distinct("followerId", { followerId: { $in: ids }, followeeId: viewer }),
    blockedAmong(viewer, ids),
    User.find({ _id: { $in: ids }, handle: { $ne: null } }).select("handle name hue").lean<Person[]>(),
  ]);
  const backs = new Set(back.map(String));
  return users
    .filter((u) => u.handle && !blocked.has(String(u._id)))
    .map((u) => ({ ...whoOf(u), mutual: backs.has(String(u._id)) }))
    .sort((a, b) => Number(b.mutual) - Number(a.mutual) || a.name.localeCompare(b.name));
}

function toUpdate(u: IThreadUpdate, handle: (id: unknown) => string | null): ThreadUpdateT | null {
  const by = handle(u.by);
  if (!by) return null;
  const people = (u.people ?? []).flatMap((p) => handle(p) ?? []);
  // A line about people who have all since gone says nothing.
  if (u.kind === "note" && (u.what === "shared" || u.what === "unshared") && !people.length) return null;
  const cheers: ThreadUpdateT["cheers"] = {};
  for (const c of u.cheers ?? []) {
    const h = handle(c.by);
    if (h) (cheers[c.kind] ??= []).push(h);
  }
  return {
    _id: String(u._id),
    kind: u.kind,
    by,
    text: u.text ?? "",
    status: u.status ?? null,
    day: u.day ?? null,
    what: u.what ?? null,
    people,
    comments: (u.comments ?? []).flatMap((c) => {
      const h = handle(c.by);
      return h ? [{ _id: String(c._id), by: h, text: c.text, at: new Date(c.at).toISOString() }] : [];
    }),
    cheers,
    at: new Date(u.createdAt).toISOString(),
  };
}

async function toShared(t: Doc, viewer: string, before?: Date): Promise<SharedThreadT> {
  const found = await ThreadUpdate.find({ threadId: t._id, ...(before ? { createdAt: { $lt: before } } : {}) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(UPDATES_PAGE + 1)
    .lean<IThreadUpdate[]>();
  const updates = found.slice(0, UPDATES_PAGE);
  const ids = new Set<string>([String(t.userId), viewer, ...t.with.map(String)]);
  for (const u of updates) {
    ids.add(String(u.by));
    for (const p of u.people ?? []) ids.add(String(p));
    for (const c of u.comments ?? []) ids.add(String(c.by));
    for (const c of u.cheers ?? []) ids.add(String(c.by));
  }
  const users = await User.find({ _id: { $in: [...ids] } }).select("handle name hue timezone").lean<Person[]>();
  const byId = new Map(users.filter((u) => u.handle).map((u) => [String(u._id), u]));
  const handle = (id: unknown) => byId.get(String(id))?.handle ?? null;
  const people: Record<string, Who> = {};
  for (const u of byId.values()) people[u.handle!] = whoOf(u);
  // A habit's day is its writer's.
  const tz = validTimeZone(users.find((u) => same(u._id, t.userId))?.timezone);
  const now = new Date();
  const streak = liveStreak(t, { userId: String(t.userId), tz, now, day: localDay(tz, now) });
  const lastTouchedAt = new Date(t.lastTouchedAt).toISOString();
  return {
    _id: String(t._id),
    title: t.title,
    kind: t.kind,
    status: t.status,
    hue: t.hue ?? 0,
    dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null,
    streak,
    doneToday: t.kind === "habit" && doneToday({ streak, lastTouchedAt }, localDay(tz, now), tz),
    lastTouchedAt,
    archived: Boolean(t.archived),
    mine: same(t.userId, viewer),
    owner: handle(t.userId) ?? "",
    me: handle(viewer) ?? "",
    with: t.with.flatMap((w) => handle(w) ?? []),
    people,
    updates: updates.flatMap((u) => toUpdate(u, handle) ?? []),
    more: found.length > UPDATES_PAGE,
  };
}

/** A thread as the viewer may see it shared, with its newest updates (or those before `before`). Null when it isn't theirs to see. */
export async function sharedThread(viewer: string, threadId: string, before?: Date): Promise<SharedThreadT | null> {
  const t = await visible(viewer, threadId);
  return t ? toShared(t, viewer, before) : null;
}

const current = async (viewer: string, threadId: string): Promise<Outcome<SharedThreadT>> => {
  const value = await sharedThread(viewer, threadId);
  return value ? { ok: true, value } : fail("Not found", 404);
};

/** Threads friends have shared with the viewer, most recently added to first. */
export async function sharedWithMe(viewer: string): Promise<SharedRowT[]> {
  if (!isObjectId(viewer)) return [];
  const docs = await Thread.find({ with: viewer, archived: false })
    .select("userId title kind status hue with updatedAt")
    .limit(60)
    .lean<(Pick<Doc, "_id" | "userId" | "title" | "kind" | "status" | "hue" | "with"> & { updatedAt: Date })[]>();
  if (!docs.length) return [];
  const [latest, users] = await Promise.all([
    ThreadUpdate.aggregate<{ _id: Types.ObjectId; at: Date }>([
      { $match: { threadId: { $in: docs.map((d) => d._id) } } },
      { $group: { _id: "$threadId", at: { $max: "$createdAt" } } },
    ]),
    User.find({ _id: { $in: [...new Set(docs.flatMap((d) => [String(d.userId), ...d.with.map(String)]))] } })
      .select("handle name hue")
      .lean<Person[]>(),
  ]);
  const at = new Map(latest.map((l) => [String(l._id), l.at]));
  const who = new Map(users.filter((u) => u.handle).map((u) => [String(u._id), whoOf(u)]));
  return docs
    .flatMap((d) => {
      const owner = who.get(String(d.userId));
      if (!owner) return [];
      const others = d.with.filter((w) => !same(w, viewer)).flatMap((w) => who.get(String(w)) ?? []);
      return [{ _id: String(d._id), title: d.title, kind: d.kind, status: d.status, hue: d.hue ?? 0, owner, with: others, lastAt: new Date(at.get(String(d._id)) ?? d.updatedAt).toISOString() }];
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Who each of the writer's shared threads is shared with, by thread, for their Threads page. */
export async function sharedPeople(userId: string): Promise<Record<string, Who[]>> {
  if (!isObjectId(userId)) return {};
  const docs = await Thread.find({ userId, "with.0": { $exists: true } }).select("with").lean<Pick<IThread, "_id" | "with">[]>();
  if (!docs.length) return {};
  const users = await User.find({ _id: { $in: [...new Set(docs.flatMap((d) => d.with.map(String)))] } }).select("handle name hue").lean<Person[]>();
  const who = new Map(users.filter((u) => u.handle).map((u) => [String(u._id), whoOf(u)]));
  return Object.fromEntries(docs.map((d) => [String(d._id), d.with.flatMap((w) => who.get(String(w)) ?? [])]));
}

const note = (t: Doc, by: string, what: NoteKind, people: Types.ObjectId[]) =>
  ThreadUpdate.create({ threadId: t._id, ownerId: t.userId, by, kind: "note", what, people });

/** Shares the writer's thread with friends of theirs, by handle. They hear about it. */
export async function share(viewer: string, threadId: string, handles: string[]): Promise<Outcome<SharedThreadT>> {
  const t = await ownThread(viewer, threadId);
  if (!t) return fail("Not found", 404);
  if (t.archived) return fail(ARCHIVED, 409);
  const wanted = [...new Set(handles.map(normalizeHandle))].filter((h) => HANDLE_PATTERN.test(h));
  if (!wanted.length) return fail("Pick someone to share it with.", 400);
  const users = await User.find({ handle: { $in: wanted } }).select("_id").lean<{ _id: Types.ObjectId }[]>();
  const ids = users.map((u) => u._id).filter((id) => !same(id, viewer));
  const friends = await friendsOf(viewer, ids);
  if (users.length !== wanted.length || !ids.length || ids.some((id) => !friends.has(String(id)))) {
    return fail("A thread can only be shared with people you follow who follow you back.", 403);
  }
  const fresh = ids.filter((id) => !isOn(t, String(id)));
  if (t.with.length + fresh.length > SHARE_MOST) return fail(`A thread can be shared with ${SHARE_MOST} people at most.`, 409);
  if (fresh.length) {
    await Thread.updateOne({ _id: t._id, userId: t.userId }, { $addToSet: { with: { $each: fresh } } });
    await note(t, viewer, "shared", fresh);
    await Promise.all(fresh.map((id) => notify({ userId: id, actorId: viewer, kind: "shared", momentId: null, threadId: t._id }, { fresh: true })));
  }
  return current(viewer, threadId);
}

/** Stops sharing the writer's thread with one person. What they added stays. */
export async function unshare(viewer: string, threadId: string, handle: string): Promise<Outcome<SharedThreadT>> {
  const t = await ownThread(viewer, threadId);
  if (!t) return fail("Not found", 404);
  const u = await User.findOne({ handle: normalizeHandle(handle) }).select("_id").lean<{ _id: Types.ObjectId }>();
  if (!u || !isOn(t, String(u._id))) return fail("It isn’t shared with them.", 404);
  await Thread.updateOne({ _id: t._id }, { $pull: { with: u._id } });
  await Promise.all([note(t, viewer, "unshared", [u._id]), Notification.deleteMany({ userId: u._id, threadId: t._id })]);
  return current(viewer, threadId);
}

/** The writer's thread private again: nobody else sees it, and what they added stays on it. */
export async function makePrivate(viewer: string, threadId: string): Promise<Outcome<SharedThreadT>> {
  const t = await ownThread(viewer, threadId);
  if (!t) return fail("Not found", 404);
  if (t.with.length) {
    await Thread.updateOne({ _id: t._id }, { $set: { with: [] } });
    await Promise.all([note(t, viewer, "private", t.with), Notification.deleteMany({ userId: { $in: t.with }, threadId: t._id })]);
  }
  return current(viewer, threadId);
}

/** Someone it's shared with takes themselves off it. What they added stays. */
export async function leave(viewer: string, threadId: string): Promise<Outcome<{ left: true }>> {
  if (!isObjectId(viewer) || !isObjectId(threadId)) return fail("Not found", 404);
  const t = await Thread.findOne({ _id: threadId, with: viewer }).select(DOC).lean<Doc>();
  if (!t) return fail("It isn’t shared with you.", 404);
  await Thread.updateOne({ _id: t._id }, { $pull: { with: new Types.ObjectId(viewer) } });
  await Promise.all([note(t, viewer, "left", []), Notification.deleteMany({ userId: viewer, threadId: t._id })]);
  return { ok: true, value: { left: true } };
}

/** What adding to a thread needs: one the viewer sees, shared, and not archived. */
async function open(viewer: string, threadId: string): Promise<Outcome<Doc>> {
  const t = await visible(viewer, threadId);
  if (!t) return fail("Not found", 404);
  if (t.archived) return fail(ARCHIVED, 409);
  if (!t.with.length) return fail("Share it first: updates are for the people it’s shared with.", 409);
  return { ok: true, value: t };
}

const words = (text: string, most: number) => text.replace(/\s+/g, " ").trim().slice(0, most);

/** An update in the viewer's words. Everyone else on the thread hears. */
export async function post(viewer: string, threadId: string, text: string): Promise<Outcome<SharedThreadT>> {
  const o = await open(viewer, threadId);
  if (!o.ok) return o;
  const t = o.value;
  const said = words(text, UPDATE_MAX);
  if (!said) return fail("Write something first.", 400);
  await ThreadUpdate.create({ threadId: t._id, ownerId: t.userId, by: viewer, kind: "update", text: said });
  const others = [t.userId, ...t.with].filter((id) => !same(id, viewer));
  await Promise.all(others.map((id) => notify({ userId: id, actorId: viewer, kind: "update", momentId: null, threadId: t._id }, { fresh: true })));
  return current(viewer, threadId);
}

/** A comment on an update. Whoever wrote the update hears, and so does the thread's writer. */
export async function comment(viewer: string, threadId: string, updateId: string, text: string): Promise<Outcome<SharedThreadT>> {
  const o = await open(viewer, threadId);
  if (!o.ok) return o;
  const t = o.value;
  if (!isObjectId(updateId)) return fail("Not found", 404);
  const said = words(text, COMMENT_MAX);
  if (!said) return fail("Write something first.", 400);
  const u = await ThreadUpdate.findOneAndUpdate(
    { _id: updateId, threadId: t._id, kind: "update", [`comments.${COMMENTS_MOST - 1}`]: { $exists: false } },
    { $push: { comments: { by: new Types.ObjectId(viewer), text: said, at: new Date() } } },
    { returnDocument: "after", projection: { by: 1 } }
  ).lean<Pick<IThreadUpdate, "_id" | "by">>();
  if (!u) {
    const there = await ThreadUpdate.exists({ _id: updateId, threadId: t._id, kind: "update" });
    return there ? fail("That update has all the comments it can take.", 409) : fail("Not found", 404);
  }
  const to = [...new Set([String(u.by), String(t.userId)])].filter((id) => id !== viewer);
  await Promise.all(to.map((id) => notify({ userId: id, actorId: viewer, kind: "comment", momentId: null, threadId: t._id }, { fresh: true })));
  return current(viewer, threadId);
}

/** Cheers someone else's update on, or takes it back. They hear about it once. */
export async function cheer(viewer: string, threadId: string, updateId: string, kind: ReactionKind): Promise<Outcome<SharedThreadT>> {
  const o = await open(viewer, threadId);
  if (!o.ok) return o;
  const t = o.value;
  if (!isObjectId(updateId) || !REACTION_KINDS.includes(kind)) return fail("Not found", 404);
  const u = await ThreadUpdate.findOne({ _id: updateId, threadId: t._id, kind: "update" }).select("by cheers").lean<Pick<IThreadUpdate, "_id" | "by" | "cheers">>();
  if (!u) return fail("Not found", 404);
  if (same(u.by, viewer)) return fail("That’s your own update.", 400);
  const me = new Types.ObjectId(viewer);
  const had = (u.cheers ?? []).some((c) => same(c.by, viewer) && c.kind === kind);
  if (had) await ThreadUpdate.updateOne({ _id: u._id }, { $pull: { cheers: { by: me, kind } } });
  else await ThreadUpdate.updateOne({ _id: u._id, cheers: { $not: { $elemMatch: { by: me, kind } } } }, { $push: { cheers: { by: me, kind } } });
  const key = { userId: u.by, actorId: viewer, kind: "cheer" as const, momentId: null, threadId: t._id };
  if (had) await unnotify(key);
  else await notify(key, { reaction: kind });
  return current(viewer, threadId);
}

/** Opening a shared thread reads what was new on it. */
export async function seenThread(viewer: string, threadId: string): Promise<void> {
  if (!isObjectId(viewer) || !isObjectId(threadId)) return;
  await Notification.updateMany({ userId: viewer, threadId, read: false }, { $set: { read: true } });
}

/** What goes with deleted threads: their updates, and what anyone was told about them. */
export async function forgetThreads(ids: Types.ObjectId[]): Promise<void> {
  if (!ids.length) return;
  await Promise.all([ThreadUpdate.deleteMany({ threadId: { $in: ids } }), Notification.deleteMany({ threadId: { $in: ids } })]);
}

/** What someone added to other people's shared threads, and their place on them, for when their account goes. */
export async function leaveAllShared(uid: Types.ObjectId): Promise<void> {
  await Promise.all([
    Thread.updateMany({ with: uid }, { $pull: { with: uid } }),
    ThreadUpdate.deleteMany({ by: uid }),
    ThreadUpdate.updateMany({ "comments.by": uid }, { $pull: { comments: { by: uid } } }),
    ThreadUpdate.updateMany({ "cheers.by": uid }, { $pull: { cheers: { by: uid } } }),
  ]);
}

/** A block takes each person off the other's shared threads, without a word on them. */
export async function blockShared(a: Types.ObjectId, b: Types.ObjectId): Promise<void> {
  await Promise.all([Thread.updateMany({ userId: a, with: b }, { $pull: { with: b } }), Thread.updateMany({ userId: b, with: a }, { $pull: { with: a } })]);
}
