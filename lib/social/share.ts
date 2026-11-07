import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { hueOf } from "./dto";
import { HANDLE_PATTERN, normalizeHandle } from "./handles";

/**
 * What a shared profile link shows anyone, signed in or not: the same things a profile shows
 * everyone (name, handle, role, bio), never moments, threads or pages. Only someone with a handle
 * has a link to share.
 */
export interface ShareCardT {
  name: string;
  handle: string;
  bio: string;
  role: string | null;
  hue: number;
}

export async function shareCard(raw: string): Promise<ShareCardT | null> {
  const handle = normalizeHandle(raw);
  if (!HANDLE_PATTERN.test(handle)) return null;
  await connectDB();
  const user = await User.findOne({ handle }).select("name handle bio role hue").lean();
  if (!user?.handle) return null;
  return {
    name: user.name,
    handle: user.handle,
    bio: user.bio ?? "",
    role: user.role && user.role !== "Custom" ? user.role : null,
    hue: hueOf(user),
  };
}
