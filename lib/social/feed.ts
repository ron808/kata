import type { PipelineStage, QueryFilter } from "mongoose";
import { z } from "zod";
import { Moment, type IMoment } from "@/lib/db/models/Moment";
import { User } from "@/lib/db/models/User";
import type { MomentT } from "@/lib/types";
import { isObjectId, objectId } from "./db";
import { momentsFor } from "./dto";
import { followingIds, friendsAmong, visibleTo } from "./visibility";

export const FEED_PAGE = 20;
const HOUR = 3_600_000;
const DISCOVER_WINDOW = 30 * 24 * HOUR;
/** A moment's pull halves every three days, so a week-old one needs about five times the response. */
const HALF_LIFE = 72 * HOUR;

export type FeedScope = "following" | "discover";

export interface FeedOptions {
  scope: FeedScope;
  tag?: string;
  /** The `next` of the previous page. */
  before?: string;
}

export interface FeedPage {
  moments: MomentT[];
  next: string | null;
}

/** Where a page ended: createdAt and _id; Discover adds the score and the time it was scored at. */
const Position = z.object({ c: z.number().int(), i: z.string().refine(isObjectId) });
const RankedPosition = Position.extend({ s: z.number(), t: z.number().int() });

function encode(position: z.infer<typeof Position> | z.infer<typeof RankedPosition>): string {
  return Buffer.from(JSON.stringify(position)).toString("base64url");
}

function decode<T extends z.ZodType>(schema: T, raw: string): z.output<T> | null {
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isFeedCursor(scope: FeedScope, raw: string): boolean {
  return decode(scope === "discover" ? RankedPosition : Position, raw) !== null;
}

/** Following: you and the people you follow, newest first. Discover: see `discover`. */
export async function feed(viewerId: string, options: FeedOptions): Promise<FeedPage> {
  return options.scope === "discover" ? discover(viewerId, options) : following(viewerId, options);
}

async function following(viewerId: string, { tag, before }: FeedOptions): Promise<FeedPage> {
  const followees = await followingIds(viewerId);
  const friends = await friendsAmong(viewerId, followees);
  const at = before ? decode(Position, before) : null;

  const clauses: QueryFilter<IMoment>[] = [visibleTo(viewerId, friends)];
  if (at) {
    const createdAt = new Date(at.c);
    clauses.push({
      $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: objectId(at.i) } }],
    });
  }
  const docs = await Moment.find({
    userId: { $in: [objectId(viewerId), ...followees] },
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

/**
 * Public moments from the last 30 days by people who list themselves publicly, leaving out you and
 * the people you already follow. Ranked by response (reactions + replies), decayed by age, newest
 * first on ties. Scores are taken at the time of the first page so later pages don't shift.
 */
async function discover(viewerId: string, { tag, before }: FeedOptions): Promise<FeedPage> {
  const at = before ? decode(RankedPosition, before) : null;
  const asOf = new Date(at ? at.t : Date.now());
  const excluded = [objectId(viewerId), ...(await followingIds(viewerId))];

  const score = {
    $multiply: [
      { $add: [1, "$reactions.nice", "$reactions.same", "$reactions.go", "$reactions.hug", "$replyCount"] },
      { $pow: [0.5, { $divide: [{ $subtract: [asOf, "$createdAt"] }, HALF_LIFE] }] },
    ],
  };
  const pipeline: PipelineStage[] = [
    {
      $match: {
        visibility: "public",
        createdAt: { $gte: new Date(asOf.getTime() - DISCOVER_WINDOW), $lte: asOf },
        userId: { $nin: excluded },
        ...(tag ? { tags: tag } : {}),
      },
    },
    { $addFields: { score } },
  ];
  if (at) {
    const createdAt = new Date(at.c);
    pipeline.push({
      $match: {
        $or: [
          { score: { $lt: at.s } },
          { score: at.s, createdAt: { $lt: createdAt } },
          { score: at.s, createdAt, _id: { $lt: objectId(at.i) } },
        ],
      },
    });
  }
  pipeline.push(
    { $sort: { score: -1, createdAt: -1, _id: -1 } },
    // After the sort, so only the moments that make the page pay for the lookup.
    {
      $lookup: {
        from: User.collection.name,
        localField: "userId",
        foreignField: "_id",
        as: "author",
        pipeline: [{ $project: { isPublic: 1 } }],
      },
    },
    { $match: { "author.isPublic": true } },
    { $limit: FEED_PAGE + 1 },
    { $project: { author: 0 } }
  );

  const docs = await Moment.aggregate<IMoment & { score: number }>(pipeline);
  const page = docs.slice(0, FEED_PAGE);
  const last = page[page.length - 1];
  return {
    moments: await momentsFor(viewerId, page),
    next:
      docs.length > FEED_PAGE
        ? encode({ c: last.createdAt.getTime(), i: String(last._id), s: last.score, t: asOf.getTime() })
        : null,
  };
}
