import { connectDB } from "@/lib/db/mongoose";
import { Moment } from "@/lib/db/models/Moment";
import { User } from "@/lib/db/models/User";
import { objectId } from "@/lib/social/db";
import { roleLabel } from "@/lib/social/people";
import type { PeopleFacets } from "@/components/people/PeopleHome";

const DAY = 24 * 3_600_000;

/**
 * The filters worth offering on /people: roles and interests that listed people actually have,
 * and tags on the public moments Discover can show (last 30 days, listed authors). Counts only
 * decide the order; nothing here says who.
 */
export async function loadFacets(viewerId: string): Promise<PeopleFacets> {
  await connectDB();
  const me = objectId(viewerId);
  const listed = { isPublic: true, handle: { $type: "string" }, _id: { $ne: me } };
  const [roles, interests, topics] = await Promise.all([
    User.aggregate<{ _id: string }>([
      { $match: { ...listed, role: { $nin: ["", "Custom", null] } } },
      { $group: { _id: "$role", n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 10 },
    ]),
    User.aggregate<{ _id: string }>([
      { $match: listed },
      { $unwind: "$interests" },
      { $group: { _id: { $toLower: "$interests" }, n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 14 },
    ]),
    Moment.aggregate<{ _id: string }>([
      { $match: { visibility: "public", createdAt: { $gte: new Date(Date.now() - 30 * DAY) }, userId: { $ne: me } } },
      { $unwind: "$tags" },
      { $group: { _id: { tag: "$tags", user: "$userId" } } },
      { $lookup: { from: User.collection.name, localField: "_id.user", foreignField: "_id", as: "author", pipeline: [{ $project: { isPublic: 1 } }] } },
      { $match: { "author.isPublic": true } },
      { $group: { _id: "$_id.tag", n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 12 },
    ]),
  ]);
  return {
    // "Founder" and "Founder / CEO" are one chip.
    roles: [...new Set(roles.map((r) => r._id).filter(Boolean).map(roleLabel))],
    interests: interests.map((i) => i._id).filter(Boolean),
    topics: topics.map((t) => t._id).filter(Boolean),
  };
}
