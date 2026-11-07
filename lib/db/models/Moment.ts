import mongoose, { Schema, type Model } from "mongoose";

/**
 * Something a writer chose to share. Pages stay private; a moment is the only
 * thing other people ever see.
 */
export const MOMENT_KINDS = ["win", "ship", "thought", "question", "milestone", "page"] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];

/** public: anyone signed in, on the author's profile and in their followers' feeds. friends: mutual follows only. */
export const VISIBILITIES = ["public", "friends"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const REACTION_KINDS = ["nice", "same", "go", "hug"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export interface IMoment {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  kind: MomentKind;
  tags: string[];
  threadTitle: string | null;
  visibility: Visibility;
  entryId: mongoose.Types.ObjectId | null;
  reactions: Record<ReactionKind, number>;
  replyCount: number;
  createdAt: Date;
}

const MomentSchema = new Schema<IMoment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    kind: { type: String, enum: MOMENT_KINDS, default: "thought" },
    tags: [{ type: String }],
    threadTitle: { type: String, default: null, maxlength: 60 },
    visibility: { type: String, enum: VISIBILITIES, default: "public" },
    entryId: { type: Schema.Types.ObjectId, ref: "Entry", default: null },
    reactions: {
      nice: { type: Number, default: 0 },
      same: { type: Number, default: 0 },
      go: { type: Number, default: 0 },
      hug: { type: Number, default: 0 },
    },
    replyCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

MomentSchema.index({ userId: 1, createdAt: -1 });
MomentSchema.index({ visibility: 1, createdAt: -1 });
MomentSchema.index({ tags: 1, createdAt: -1 });

export const Moment: Model<IMoment> =
  mongoose.models.Moment ?? mongoose.model<IMoment>("Moment", MomentSchema);
