import type { Types } from "mongoose";
import type { ReactionKind } from "@/lib/db/models/Moment";
import { Notification, type NotificationKind } from "@/lib/db/models/Notification";

type Id = Types.ObjectId | string;

export interface NotificationKey {
  /** Who it's for. */
  userId: Id;
  actorId: Id;
  kind: NotificationKind;
  momentId: Id | null;
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
  const surfaced = { read: false, createdAt: new Date() };
  await Notification.updateOne(
    key,
    fresh ? { $set: { ...surfaced, reaction } } : { $set: { reaction }, $setOnInsert: surfaced },
    { upsert: true }
  );
}

/** Withdraws a notification once what it announced has been undone. */
export async function unnotify(key: NotificationKey): Promise<void> {
  await Notification.deleteOne(key);
}
