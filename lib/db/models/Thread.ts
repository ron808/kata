import mongoose, { Schema, type Model } from "mongoose";

/**
 * A thread is one ongoing thing in a writer's life that Kata keeps track of:
 * a project, a goal, a habit, a person, an upcoming event. Together they are
 * Kata's mental model of the writer, and what its check-ins ask about.
 */
export const THREAD_KINDS = [
  "project",
  "task",
  "goal",
  "habit",
  "person",
  "event",
  "health",
  "learning",
  "other",
] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];

export const THREAD_STATUSES = ["moving", "stuck", "waiting", "done", "paused"] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

export interface IThreadLog {
  at: Date;
  text: string;
  status: ThreadStatus | null;
  from: "you" | "kata" | "page";
}

export const THREAD_FIELD_TYPES = ["number", "text"] as const;

/** Something a thread keeps a value on, made up for it: minutes walked, guests coming. */
export interface IThreadField {
  /** From the label, so the same thing isn't kept twice. */
  key: string;
  label: string;
  type: (typeof THREAD_FIELD_TYPES)[number];
  /** What a number counts in ("min", "km"); empty for a plain count. */
  unit: string;
  /** A number to reach each day. */
  goal: number | null;
  /** The latest value, and when it was set. */
  value: number | string | null;
  at: Date | null;
  /** Numbers: one value per local day (yyyy-mm-dd), oldest first, the last 60. */
  days: { day: string; value: number }[];
}

export interface IThread {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  /** Normalised title (lowercase, single spaces) so the same thread isn't created twice. */
  key: string;
  kind: ThreadKind;
  status: ThreadStatus;
  tags: string[];
  nextStep: string;
  /** The latest thing said about it, in the writer's words where possible. */
  lastNote: string;
  dueAt: Date | null;
  lastTouchedAt: Date;
  touchCount: number;
  /** Habits: consecutive local days it was touched. */
  streak: number;
  /** Habits: the local days it was done, oldest first, the last 400. */
  doneDays: string[];
  /** Index into the thread palette (0–7). */
  hue: number;
  /** Shown on the writer's profile as something they're working on. */
  shared: boolean;
  source: "kata" | "page" | "manual";
  archived: boolean;
  /** Newest last, capped at 40 entries. */
  log: IThreadLog[];
  /** What it keeps a value on, up to four. */
  fields: IThreadField[];
  createdAt: Date;
  updatedAt: Date;
}

const ThreadLogSchema = new Schema<IThreadLog>(
  {
    at: { type: Date, default: Date.now },
    text: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: [...THREAD_STATUSES, null], default: null },
    from: { type: String, enum: ["you", "kata", "page"], default: "you" },
  },
  { _id: false }
);

const ThreadFieldSchema = new Schema<IThreadField>(
  {
    key: { type: String, required: true, maxlength: 40 },
    label: { type: String, required: true, maxlength: 30 },
    type: { type: String, enum: THREAD_FIELD_TYPES, default: "number" },
    unit: { type: String, default: "", maxlength: 12 },
    goal: { type: Number, default: null },
    value: { type: Schema.Types.Mixed, default: null },
    at: { type: Date, default: null },
    days: {
      type: [new Schema({ day: { type: String, required: true }, value: { type: Number, required: true } }, { _id: false })],
      default: [],
    },
  },
  { _id: false }
);

const ThreadSchema = new Schema<IThread>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    key: { type: String, required: true },
    kind: { type: String, enum: THREAD_KINDS, default: "other" },
    status: { type: String, enum: THREAD_STATUSES, default: "moving" },
    tags: [{ type: String }],
    nextStep: { type: String, default: "", maxlength: 140 },
    lastNote: { type: String, default: "", maxlength: 280 },
    dueAt: { type: Date, default: null },
    lastTouchedAt: { type: Date, default: Date.now },
    touchCount: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    doneDays: { type: [String], default: [] },
    hue: { type: Number, default: 0 },
    shared: { type: Boolean, default: false },
    source: { type: String, enum: ["kata", "page", "manual"], default: "manual" },
    archived: { type: Boolean, default: false },
    log: { type: [ThreadLogSchema], default: [] },
    fields: { type: [ThreadFieldSchema], default: [] },
  },
  { timestamps: true }
);

ThreadSchema.index({ userId: 1, key: 1 }, { unique: true });
ThreadSchema.index({ userId: 1, archived: 1, lastTouchedAt: -1 });

export const Thread: Model<IThread> =
  mongoose.models.Thread ?? mongoose.model<IThread>("Thread", ThreadSchema);

export function threadKey(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}
