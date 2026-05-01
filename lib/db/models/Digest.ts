import mongoose, { Schema, type Model } from "mongoose";

export interface IDigest {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  content: string;
  entryCount: number;
  wordCount: number;
  isRead: boolean;
  createdAt: Date;
}

const DigestSchema = new Schema<IDigest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["weekly", "monthly"], required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    content: { type: String, required: true },
    entryCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

DigestSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Digest: Model<IDigest> =
  mongoose.models.Digest ?? mongoose.model<IDigest>("Digest", DigestSchema);
