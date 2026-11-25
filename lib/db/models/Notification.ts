import mongoose, { Schema, type Model } from "mongoose";
import { REACTION_KINDS, type ReactionKind } from "./Moment";

/**
 * Moments: follow, reaction, reply. Shared threads: shared (a thread was shared with you), update
 * (someone added to one you're on), comment (on your update), cheer (your update was cheered).
 */
export const NOTIFICATION_KINDS = ["follow", "reaction", "reply", "shared", "update", "comment", "cheer"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface INotification {
  _id: mongoose.Types.ObjectId;
  /** Who it's for. */
  userId: mongoose.Types.ObjectId;
  /** Who did it. */
  actorId: mongoose.Types.ObjectId;
  kind: NotificationKind;
  momentId: mongoose.Types.ObjectId | null;
  /** The shared thread it's about. */
  threadId?: mongoose.Types.ObjectId | null;
  reaction: ReactionKind | null;
  read: boolean;
  /** Withdrawn (an unfollow, a reaction or cheer taken back): kept, read and hidden, so toggling it on again can't notify twice. */
  gone?: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    momentId: { type: Schema.Types.ObjectId, ref: "Moment", default: null },
    threadId: { type: Schema.Types.ObjectId, ref: "Thread", default: null },
    reaction: { type: String, enum: [...REACTION_KINDS, null], default: null },
    read: { type: Boolean, default: false },
    gone: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>("Notification", NotificationSchema);
