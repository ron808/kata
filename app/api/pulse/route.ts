import { NextResponse } from "next/server";
import { z } from "zod";
import { handleError, requireUser } from "@/lib/api";
import { Notification } from "@/lib/db/models/Notification";
import { connectDB } from "@/lib/db/mongoose";
import { notificationsFor } from "@/lib/social/dto";
import { unreadMessages } from "@/lib/social/messages";
import { markSeen } from "@/lib/social/presence";
import type { NotificationT } from "@/lib/types";

const When = z.string().datetime().optional();

/** A notification in a few words, for the toast: who did what. */
function line(n: NotificationT): string {
  const who = n.actor.name.split(/\s+/)[0] || n.actor.name;
  if (n.kind === "follow") return `${who} followed you`;
  if (n.kind === "reply") return `${who} replied to your moment`;
  return `${who} reacted to your moment`;
}

/**
 * What the shell checks every few seconds while Kata is open: notifications and messages waiting,
 * and a line about the newest notification once it's newer than `after` (the shell's last one), so a
 * page load never toasts what was already there. It also keeps `lastSeenAt`, which is how friends
 * see someone is here. Three small indexed reads, and a write at most once a minute.
 */
export async function GET(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const after = When.safeParse(new URL(request.url).searchParams.get("after") ?? undefined);
    const me = session.user.id;
    await connectDB();
    const [notifications, messages, newest] = await Promise.all([
      Notification.countDocuments({ userId: me, read: false }),
      unreadMessages(me),
      Notification.findOne({ userId: me, read: false }).sort({ createdAt: -1, _id: -1 }).lean(),
      markSeen(me),
    ]);
    const newestAt = newest ? new Date(newest.createdAt).toISOString() : null;
    let latest: { text: string } | null = null;
    if (newest && newestAt && after.success && after.data && newestAt > after.data) {
      const [n] = await notificationsFor([newest]);
      if (n) latest = { text: line(n) };
    }
    // checkedAt is the baseline when nothing is unread, so the next notification still toasts.
    return NextResponse.json({ notifications, messages, newestAt, checkedAt: new Date().toISOString(), latest });
  } catch (err) {
    return handleError(err);
  }
}
