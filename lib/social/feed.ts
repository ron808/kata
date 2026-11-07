import type { QueryFilter } from "mongoose";
import { z } from "zod";
import { Moment, type IMoment } from "@/lib/db/models/Moment";
import type { MomentT } from "@/lib/types";
import { isObjectId, objectId } from "./db";
import { momentsFor } from "./dto";
import { friendsAmong, visibleTo, yourPeople } from "./visibility";

export const FEED_PAGE = 20;

export interface FeedOptions {
  tag?: string;
  /** The `next` of the previous page. */
  before?: string;
}

export interface FeedPage {
  moments: MomentT[];
  next: string | null;
}

/** Where a page ended: createdAt and _id. */
const Position = z.object({ c: z.number().int(), i: z.string().refine(isObjectId) });

function encode(position: z.infer<typeof Position>): string {
  return Buffer.from(JSON.stringify(position)).toString("base64url");
}

function decode(raw: string): z.infer<typeof Position> | null {
  try {
    const parsed = Position.safeParse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isFeedCursor(raw: string): boolean {
  return decode(raw) !== null;
}

/**
 * You and your people, newest first: the ones you picked, or everyone you follow until you pick
 * any. Nobody else's moments come here; anyone else is found by name.
 */
export async function feed(viewerId: string, { tag, before }: FeedOptions): Promise<FeedPage> {
  const { ids } = await yourPeople(viewerId);
  const friends = await friendsAmong(viewerId, ids);
  const at = before ? decode(before) : null;

  const clauses: QueryFilter<IMoment>[] = [visibleTo(viewerId, friends)];
  if (at) {
    const createdAt = new Date(at.c);
    clauses.push({
      $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: objectId(at.i) } }],
    });
  }
  const docs = await Moment.find({
    userId: { $in: [objectId(viewerId), ...ids] },
    ...(tag ? { tags: tag } : {}),
    $and: clauses,
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(FEED_PAGE + 1)
    .lean();

  const page = docs.slice(0, FEED_PAGE);
  const last = page[page.length - 1];
  return {
    moments: await momentsFor(viewerId, page),
    next: docs.length > FEED_PAGE ? encode({ c: last.createdAt.getTime(), i: String(last._id) }) : null,
  };
}
