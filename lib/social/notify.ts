import type { Types } from "mongoose";
import type { ReactionKind } from "@/lib/db/models/Moment";
import { Notification, type NotificationKind } from "@/lib/db/models/Notification";
import { blockedBetween } from "./visibility";

type Id = Types.ObjectId | string;

export interface NotificationKey {
  /** Who it's for. */
  userId: Id;
  actorId: Id;
  kind: NotificationKind;
  momentId: Id | null;
  /** A shared thread's: one notification per actor, kind and thread. */
  threadId?: Id | null;
}

/**
 * One notification per actor, kind and moment: repeats collapse into it. `fresh` brings it back to
 * the top as unread, for something new to read (a reply); toggles (follows, reactions) don't, so
 * flicking one on and off can't keep pushing it at someone.
 */
export async function notify(
  key: NotificationKey,
  { reaction = null, fresh = false }: { reaction?: ReactionKind | null; fresh?: boolean } = {}
): Promise<void> {
  if (String(key.userId) === String(key.actorId)) return;
  // Nothing reaches someone from a person either of them has blocked.
  if (await blockedBetween(String(key.userId), String(key.actorId))) return;
  const surfaced = { read: false, createdAt: new Date() };
  await Notification.updateOne(
    key,
    fresh ? { $set: { ...surfaced, reaction, gone: false } } : { $set: { reaction, gone: false }, $setOnInsert: surfaced },
    { upsert: true }
  );
}

/** What can be flicked on and off: withdrawn, these stay (read and hidden), so flicking back can't notify again. */
const TOGGLES = new Set<NotificationKind>(["follow", "reaction", "cheer"]);

/** Withdraws a notification once what it announced has been undone. */
export async function unnotify(key: NotificationKey): Promise<void> {
  if (TOGGLES.has(key.kind)) await Notification.updateOne(key, { $set: { read: true, gone: true } });
  else await Notification.deleteOne(key);
}
