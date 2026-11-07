import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { objectId } from "@/lib/social/db";
import { roleLabel } from "@/lib/social/people";
import type { PeopleFacets } from "@/components/people/PeopleHome";

/**
 * The filters worth offering on Find people: roles and interests that listed people actually
 * have. Counts only decide the order; nothing here says who.
 */
export async function loadFacets(viewerId: string): Promise<PeopleFacets> {
  await connectDB();
  const me = objectId(viewerId);
  const listed = { isPublic: true, handle: { $type: "string" }, _id: { $ne: me } };
  const [roles, interests] = await Promise.all([
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
  ]);
  return {
    // "Founder" and "Founder / CEO" are one chip.
    roles: [...new Set(roles.map((r) => r._id).filter(Boolean).map(roleLabel))],
    interests: interests.map((i) => i._id).filter(Boolean),
  };
}
