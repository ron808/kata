import { Types } from "mongoose";
import { Follow } from "@/lib/db/models/Follow";
import { Thread, type IThread } from "@/lib/db/models/Thread";
import { User } from "@/lib/db/models/User";
import type { ThreadStatus } from "@/lib/types";
import { hueOf } from "./dto";

export interface WorkingOnT {
  handle: string;
  name: string;
  hue: number;
  title: string;
  status: ThreadStatus;
  lastTouchedAt: string;
}

/** What the people you follow chose to show as working on, freshest first. */
export async function workingOn(viewerId: string, limit = 5): Promise<WorkingOnT[]> {
  const follows = await Follow.find({ followerId: new Types.ObjectId(viewerId) }).select("followeeId").lean();
  if (!follows.length) return [];
  const threads = await Thread.find({
    userId: { $in: follows.map((f) => f.followeeId) },
    shared: true,
    archived: false,
    status: { $ne: "paused" },
  })
    .sort({ lastTouchedAt: -1 })
    .limit(limit * 3)
    .select("userId title status lastTouchedAt")
    .lean<Pick<IThread, "userId" | "title" | "status" | "lastTouchedAt">[]>();
  const users = await User.find({ _id: { $in: [...new Set(threads.map((t) => String(t.userId)))] }, handle: { $type: "string" } })
    .select("name handle hue")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  // One line per person keeps a busy friend from filling the list.
  const seen = new Set<string>();
  const out: WorkingOnT[] = [];
  for (const t of threads) {
    const u = byId.get(String(t.userId));
    if (!u?.handle || seen.has(u.handle)) continue;
    seen.add(u.handle);
    out.push({ handle: u.handle, name: u.name, hue: hueOf(u), title: t.title, status: t.status, lastTouchedAt: new Date(t.lastTouchedAt).toISOString() });
    if (out.length === limit) break;
  }
  return out;
}
