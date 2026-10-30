import { connectDB } from "@/lib/db/mongoose";
import { Reply } from "@/lib/db/models/Reply";
import { User } from "@/lib/db/models/User";
import { objectId } from "@/lib/social/db";
import { PERSON_FIELDS, peopleFor } from "@/lib/social/dto";
import type { NotificationT, PersonT } from "@/lib/types";

export interface NotificationExtras {
  /** Whoever followed you, as people, so the row can offer Follow back. By handle. */
  people: Record<string, PersonT>;
  /** The latest reply each replier left on that moment. By notification id. */
  replies: Record<string, string>;
}

/** What a notification row needs beyond NotificationT. Replies are on your own moments, so yours to read. */
export async function notificationExtras(viewerId: string, items: NotificationT[]): Promise<NotificationExtras> {
  const follows = items.filter((n) => n.kind === "follow");
  const replies = items.filter((n) => n.kind === "reply" && n.momentId);
  const handles = [...new Set([...follows, ...replies].map((n) => n.actor.handle))];
  if (!handles.length) return { people: {}, replies: {} };

  await connectDB();
  const users = await User.find({ handle: { $in: handles } }).select(PERSON_FIELDS).lean();
  const idOf = new Map(users.map((u) => [u.handle, u._id]));
  const followers = new Set(follows.map((n) => n.actor.handle));
  const pairs = replies.flatMap((n) => {
    const userId = idOf.get(n.actor.handle);
    return userId && n.momentId ? [{ momentId: objectId(n.momentId), userId }] : [];
  });

  const [people, latest] = await Promise.all([
    peopleFor(viewerId, users.filter((u) => u.handle && followers.has(u.handle))),
    pairs.length
      ? Reply.aggregate<{ _id: { m: unknown; u: unknown }; text: string }>([
          { $match: { $or: pairs } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: { m: "$momentId", u: "$userId" }, text: { $first: "$text" } } },
        ])
      : [],
  ]);
  const textOf = new Map(latest.map((r) => [`${String(r._id.m)}:${String(r._id.u)}`, r.text]));

  return {
    people: Object.fromEntries(people.map((p) => [p.handle, p])),
    replies: Object.fromEntries(
      replies.flatMap((n) => {
        const text = textOf.get(`${n.momentId}:${String(idOf.get(n.actor.handle))}`);
        return text ? [[n._id, text]] : [];
      })
    ),
  };
}
