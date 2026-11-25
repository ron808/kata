import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";

/**
 * The account's current sessionVersion (null once it's gone), read at most once a minute per
 * account on each server: a password change or a deleted account ends other sessions within that.
 */
const versions = new Map<string, { v: number | null; at: number }>();

export async function currentVersion(id: string): Promise<number | null> {
  const seen = versions.get(id);
  if (seen && Date.now() - seen.at < 60_000) return seen.v;
  await connectDB();
  const user = await User.findById(id).select("sessionVersion").lean<{ sessionVersion?: number }>();
  const v = user ? (user.sessionVersion ?? 0) : null;
  if (versions.size > 5000) versions.clear();
  versions.set(id, { v, at: Date.now() });
  return v;
}

/** Forget what this server knows about an account's sessions, after raising its version or deleting it. */
export function sessionsChanged(id: string) {
  versions.delete(id);
}
