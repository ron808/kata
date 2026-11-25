import type { Types } from "mongoose";
import { Conversation, conversationKey } from "@/lib/db/models/Conversation";
import { Entry } from "@/lib/db/models/Entry";
import { Follow } from "@/lib/db/models/Follow";
import { Moment, type MomentKind, type Visibility } from "@/lib/db/models/Moment";
import { Reply } from "@/lib/db/models/Reply";
import { User } from "@/lib/db/models/User";
import type { MomentT, PersonT, ReplyT } from "@/lib/types";
import { isDuplicateKey } from "./db";
import { momentsFor, personFor, repliesFor } from "./dto";
import { NEEDS_HANDLE, byHandle, handleOf, normalizeHandle } from "./handles";
import { notify, unnotify } from "./notify";
import { blockShared } from "./sharing";
import { blockedBetween, findVisibleMoment } from "./visibility";

/**
 * Following, sharing and replying, shared by the API routes and Maru so the rules (handles
 * first, counts that only move when a document does, notifications) live in one place.
 */

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

const fail = (error: string, status: number): Outcome<never> => ({ ok: false, error, status });

async function personByHandle(me: string, handle: string): Promise<Outcome<Types.ObjectId>> {
  const person = await User.findOne(byHandle(normalizeHandle(handle))).select("_id").lean();
  if (!person) return fail("Not found", 404);
  if (String(person._id) === me) return fail("You can't follow yourself.", 400);
  return { ok: true, value: person._id };
}

export async function follow(me: string, handle: string): Promise<Outcome<PersonT>> {
  const target = await personByHandle(me, handle);
  if (!target.ok) return target;
  if (!(await handleOf(me))) return fail(NEEDS_HANDLE, 403);
  const personId = target.value;
  // Never across a block: whoever blocked unblocks first, and the one blocked finds no one.
  if (await blockedBetween(me, String(personId))) {
    const mine = await Conversation.exists({ key: conversationKey(me, String(personId)), blockedBy: me });
    return mine ? fail("You blocked them. Unblock them first.", 409) : fail("Not found", 404);
  }
  let created = false;
  try {
    await Follow.create({ followerId: me, followeeId: personId });
    created = true;
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
  }
  if (created) {
    await Promise.all([
      User.updateOne({ _id: personId }, { $inc: { followerCount: 1 } }),
      User.updateOne({ _id: me }, { $inc: { followingCount: 1 } }),
      notify({ userId: personId, actorId: me, kind: "follow", momentId: null }),
    ]);
  }
  const person = await personFor(me, personId);
  return person ? { ok: true, value: person } : fail("Not found", 404);
}

export async function unfollow(me: string, handle: string): Promise<Outcome<PersonT>> {
  const target = await personByHandle(me, handle);
  if (!target.ok) return target;
  const personId = target.value;
  await dropFollow(me, personId);
  const person = await personFor(me, personId);
  return person ? { ok: true, value: person } : fail("Not found", 404);
}

/** Ends one follow, with the counts and the notification it made. A block ends both ways. */
export async function dropFollow(followerId: string | Types.ObjectId, followeeId: string | Types.ObjectId): Promise<void> {
  const { deletedCount } = await Follow.deleteOne({ followerId, followeeId });
  if (deletedCount !== 1) return;
  await Promise.all([
    // Shared threads are for people who follow each other.
    blockShared(followerId, followeeId),
    User.updateOne({ _id: followeeId, followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } }),
    User.updateOne({ _id: followerId, followingCount: { $gt: 0 } }, { $inc: { followingCount: -1 } }),
    unnotify({ userId: followeeId, actorId: followerId, kind: "follow", momentId: null }),
  ]);
}

/** Puts someone they follow in their people, or takes them out. Only people they follow can be in it. */
export async function setClose(me: string, handle: string, close: boolean): Promise<Outcome<PersonT>> {
  const target = await personByHandle(me, handle);
  if (!target.ok) return target;
  const res = await Follow.updateOne(
    { followerId: me, followeeId: target.value },
    close ? { $set: { close: true } } : { $unset: { close: 1 } }
  );
  if (!res.matchedCount) return fail("Follow them first.", 409);
  const person = await personFor(me, target.value);
  return person ? { ok: true, value: person } : fail("Not found", 404);
}

export interface MomentInput {
  text: string;
  kind: MomentKind;
  tags: string[];
  visibility: Visibility;
  threadTitle?: string | null;
  entryId?: string | null;
}

export async function shareMoment(me: string, input: MomentInput): Promise<Outcome<MomentT>> {
  if (!(await handleOf(me))) return fail(NEEDS_HANDLE, 403);
  if (input.entryId && !(await Entry.exists({ _id: input.entryId, userId: me }))) {
    return fail("That page isn't one of yours.", 400);
  }
  const moment = await Moment.create({
    userId: me,
    text: input.text,
    kind: input.kind,
    tags: input.tags,
    visibility: input.visibility,
    threadTitle: input.threadTitle ?? null,
    entryId: input.entryId ?? null,
  });
  const [created] = await momentsFor(me, [moment.toObject()]);
  return { ok: true, value: created };
}

/** A reply on a moment the writer can see. The moment's author hears about it. */
export async function replyTo(me: string, momentId: string, text: string): Promise<Outcome<ReplyT>> {
  const moment = await findVisibleMoment(me, momentId);
  if (!moment) return fail("Not found", 404);
  if (!(await handleOf(me))) return fail(NEEDS_HANDLE, 403);
  const reply = await Reply.create({ momentId: moment._id, userId: me, text });
  await Promise.all([
    Moment.updateOne({ _id: moment._id }, { $inc: { replyCount: 1 } }),
    notify({ userId: moment.userId, actorId: me, kind: "reply", momentId: moment._id }, { fresh: true }),
  ]);
  const [created] = await repliesFor(me, [reply.toObject()]);
  return { ok: true, value: created };
}
