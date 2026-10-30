import mongoose, { Schema, type Model } from "mongoose";
import { REACTION_KINDS, type ReactionKind } from "./Moment";

export interface IReaction {
  _id: mongoose.Types.ObjectId;
  momentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  kind: ReactionKind;
  createdAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    momentId: { type: Schema.Types.ObjectId, ref: "Moment", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: REACTION_KINDS, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ReactionSchema.index({ momentId: 1, userId: 1, kind: 1 }, { unique: true });

export const Reaction: Model<IReaction> =
  mongoose.models.Reaction ?? mongoose.model<IReaction>("Reaction", ReactionSchema);
