import mongoose, { Schema, type Model } from "mongoose";

/**
 * followerId follows followeeId. Two follows in opposite directions make friends, and only
 * friends can write to each other. `close` puts the followee in the follower's people: once
 * someone picks any, their People feed shows only those.
 */
export interface IFollow {
  _id: mongoose.Types.ObjectId;
  followerId: mongoose.Types.ObjectId;
  followeeId: mongoose.Types.ObjectId;
  /** Stored only when true. */
  close?: boolean;
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    close: Boolean,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
FollowSchema.index({ followeeId: 1, createdAt: -1 });

export const Follow: Model<IFollow> =
  mongoose.models.Follow ?? mongoose.model<IFollow>("Follow", FollowSchema);
