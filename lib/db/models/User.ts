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
  /** Public @name. Null until the writer claims one. */
  handle: string | null;
  bio: string;
  /** Listed: found by name and suggested to others. Unlisted, only a whole handle or a shared link finds them. Pages are never public. */
  isPublic: boolean;
  /** Topics the writer cares about; they steer Kata's questions. */
  interests: string[];
  checkIn: CheckIn;
  onboardedAt: Date | null;
  followerCount: number;
  followingCount: number;
  /** Index into the person palette (0–7) for their seal. */
  hue: number;
  /** Lasting facts Kata keeps about the writer, newest last. They can see and delete each one. */
  memories: IMemory[];
  /** What the writer calls their companion. Empty means the default, Maru. */
  companionName: string;
  /** What the companion calls the writer. Empty means their first name. */
  nickname: string;
  /** The hue the companion wears (1–7), or null for vermilion. */
  companionHue: number | null;
  /** The mission they're focused on, which turns the whole app over to it. */
  focusMissionId: mongoose.Types.ObjectId | null;
  /** The colours focus wears. */
  focusTheme: FocusTheme;
  /** When they last had Kata open, kept by the shell's pulse at most once a minute. */
  lastSeenAt: Date | null;
  /** Whether friends see when they're here and typing. Off, they don't see anyone's either. */
  showActive: boolean;
  /** Who they're typing to and when they last did: typing while it's a few seconds old. One chat at a time. */
  typingTo: mongoose.Types.ObjectId | null;
  typingAt: Date | null;
  createdAt: Date;
}

export interface IMemory {
  _id: mongoose.Types.ObjectId;
  text: string;
  at: Date;
}

export const FOCUS_THEMES = ["sea", "moss", "ember"] as const;
export type FocusTheme = (typeof FOCUS_THEMES)[number];

export const CHECK_INS = ["morning", "evening", "both"] as const;
export type CheckIn = (typeof CHECK_INS)[number];

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
    handle: { type: String, default: null, lowercase: true, trim: true },
    bio: { type: String, default: "", maxlength: 160 },
    isPublic: { type: Boolean, default: false },
    interests: [{ type: String }],
    checkIn: { type: String, enum: CHECK_INS, default: "morning" },
    onboardedAt: { type: Date, default: null },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    hue: { type: Number, default: () => Math.floor(Math.random() * 8) },
    memories: {
      type: [
        new Schema<IMemory>({
          text: { type: String, required: true, trim: true, maxlength: 200 },
          at: { type: Date, default: Date.now },
        }),
      ],
      default: [],
    },
    companionName: { type: String, default: "", trim: true, maxlength: 20 },
    nickname: { type: String, default: "", trim: true, maxlength: 30 },
    companionHue: { type: Number, default: null, min: 1, max: 7 },
    focusMissionId: { type: Schema.Types.ObjectId, ref: "Mission", default: null },
    focusTheme: { type: String, enum: FOCUS_THEMES, default: "sea" },
    lastSeenAt: { type: Date, default: null },
    showActive: { type: Boolean, default: true },
    typingTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    typingAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Same pattern as Template.publishedSlug: only real strings take part in uniqueness.
UserSchema.index(
  { handle: 1 },
  { unique: true, partialFilterExpression: { handle: { $type: "string" } } }
);
UserSchema.index({ isPublic: 1, followerCount: -1 });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
