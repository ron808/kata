import mongoose, { Schema, type Model } from "mongoose";

export interface IReply {
  _id: mongoose.Types.ObjectId;
  momentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const ReplySchema = new Schema<IReply>(
  {
    momentId: { type: Schema.Types.ObjectId, ref: "Moment", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ReplySchema.index({ momentId: 1, createdAt: 1 });

export const Reply: Model<IReply> =
  mongoose.models.Reply ?? mongoose.model<IReply>("Reply", ReplySchema);
