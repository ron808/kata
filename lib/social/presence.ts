import { User } from "@/lib/db/models/User";

/** How often the pulse writes `lastSeenAt` at most: the rest of the time it's one read. */
const SEEN_EVERY_MS = 60_000;

/** Records that they have Kata open. */
export async function markSeen(userId: string, now = new Date()): Promise<void> {
  await User.updateOne(
    { _id: userId, $or: [{ lastSeenAt: null }, { lastSeenAt: { $lt: new Date(now.getTime() - SEEN_EVERY_MS) } }] },
    { $set: { lastSeenAt: now } }
  );
}

type Shows = { showActive?: boolean | null };

/**
 * Whether a viewer sees when someone is here or typing: only between friends (people who can
 * write to each other), never across a block, and only while both show it. Turning it off hides
 * theirs as well, so nobody watches without being seen.
 */
export const seesActivity = (viewer: Shows, them: Shows, friends: boolean, blocked: boolean) =>
  friends && !blocked && viewer.showActive !== false && them.showActive !== false;
