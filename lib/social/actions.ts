import type { Types } from "mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { Follow } from "@/lib/db/models/Follow";
import { Moment, type MomentKind, type Visibility } from "@/lib/db/models/Moment";
import { Reply } from "@/lib/db/models/Reply";
import { User } from "@/lib/db/models/User";
import type { MomentT, PersonT, ReplyT } from "@/lib/types";
import { isDuplicateKey } from "./db";
import { momentsFor, personFor, repliesFor } from "./dto";
import { NEEDS_HANDLE, handleOf, normalizeHandle } from "./handles";
import { notify, unnotify } from "./notify";
import { findVisibleMoment } from "./visibility";

/**
 * Following, sharing and replying, shared by the API routes and Maru so the rules (handles
 * first, counts that only move when a document does, notifications) live in one place.
 */

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

const fail = (error: string, status: number): Outcome<never> => ({ ok: false, error, status });

async function personByHandle(me: string, handle: string): Promise<Outcome<Types.ObjectId>> {
  const person = await User.findOne({ handle: normalizeHandle(handle) }).select("_id").lean();
  if (!person) return fail("Not found", 404);
  if (String(person._id) === me) return fail("You can't follow yourself.", 400);
  return { ok: true, value: person._id };
}

export async function follow(me: string, handle: string): Promise<Outcome<PersonT>> {
  const target = await personByHandle(me, handle);
  if (!target.ok) return target;
  if (!(await handleOf(me))) return fail(NEEDS_HANDLE, 403);
  const personId = target.value;
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
  const { deletedCount } = await Follow.deleteOne({ followerId: me, followeeId: personId });
  if (deletedCount === 1) {
    await Promise.all([
      User.updateOne({ _id: personId, followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } }),
      User.updateOne({ _id: me, followingCount: { $gt: 0 } }, { $inc: { followingCount: -1 } }),
      unnotify({ userId: personId, actorId: me, kind: "follow", momentId: null }),
    ]);
  }
  const person = await personFor(me, personId);
  return person ? { ok: true, value: person } : fail("Not found", 404);
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
