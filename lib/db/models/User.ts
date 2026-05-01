import mongoose, { Schema, type Model } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  timezone: string;
  activeTemplateId: mongoose.Types.ObjectId | null;
  streak: number;
  longestStreak: number;
  totalEntries: number;
  totalWords: number;
  lastEntryDate: Date | null;
  lastWeeklyDigest: Date | null;
  lastMonthlyDigest: Date | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "Custom" },
    timezone: { type: String, default: "UTC" },
    activeTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalEntries: { type: Number, default: 0 },
    totalWords: { type: Number, default: 0 },
    lastEntryDate: { type: Date, default: null },
    lastWeeklyDigest: { type: Date, default: null },
    lastMonthlyDigest: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
