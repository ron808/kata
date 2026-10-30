import mongoose, { Schema, type Model } from "mongoose";
import { REACTION_KINDS, type ReactionKind } from "./Moment";

export const NOTIFICATION_KINDS = ["follow", "reaction", "reply"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface INotification {
  _id: mongoose.Types.ObjectId;
  /** Who it's for. */
  userId: mongoose.Types.ObjectId;
  /** Who did it. */
  actorId: mongoose.Types.ObjectId;
  kind: NotificationKind;
  momentId: mongoose.Types.ObjectId | null;
  reaction: ReactionKind | null;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    momentId: { type: Schema.Types.ObjectId, ref: "Moment", default: null },
    reaction: { type: String, enum: [...REACTION_KINDS, null], default: null },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>("Notification", NotificationSchema);
