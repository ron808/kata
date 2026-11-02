import mongoose, { Schema, type Model } from "mongoose";

export const MISSION_STATUSES = ["open", "done", "dropped"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const TASK_STATUSES = ["todo", "stuck", "done", "skipped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASKS_MAX = 30;
const LOG_MAX = 80;

/**
 * One thing on a mission: a thread that lasts only as long as the list does. Nothing it doesn't
 * use is stored, so a task is about 80 bytes.
 */
export interface IMissionTask {
  /** Short and stable, for the page to point at it. */
  id: string;
  title: string;
  status: TaskStatus;
  hue: number;
  /** When it's planned for. */
  at?: Date;
  /** Its own timer. Without one it counts up. */
  minutes?: number;
  /** Time on it so far, not counting the stretch running now. */
  spentMs: number;
  /** The stretch running now. */
  startedAt?: Date;
  doneAt?: Date;
  /** Where it stands, in their words. */
  note?: string;
  /** The thread it's part of, when it has the same name: done here counts there too. */
  threadId?: mongoose.Types.ObjectId;
}

/** What happened, as a line: saved so a mission can be read back and run again. */
export interface IMissionLog {
  at: Date;
  text: string;
}

/**
 * A temporary list: a to-do list for today, or a push on something for as long as it takes. It
 * lives until they end it, and one document holds everything about it, so Maru reads it all in
 * one query and its size stays small. Finished ones stay, to report on and to run again.
 */
export interface IMission {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** Empty when it's named by its day ("Today's list"). */
  title: string;
  /** The writer's day it's for. */
  day: string;
  status: MissionStatus;
  tasks: IMissionTask[];
  /** When the whole thing is meant to end, if they said. */
  endsAt: Date | null;
  /** Time in focus so far, not counting the stretch running now. */
  focusMs: number;
  /** In focus since. Null when it isn't. */
  focusedAt: Date | null;
  /** When Maru last had an answer about where things stand, so it doesn't ask again too soon. */
  askedAt: Date | null;
  log: IMissionLog[];
  /** The mission this one ran again. */
  fromId: mongoose.Types.ObjectId | null;
  endedAt: Date | null;
  /** Maru's few sentences on it, written the first time the report is opened. */
  take: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<IMissionTask>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 120 },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    hue: { type: Number, default: 0 },
    at: Date,
    minutes: Number,
    spentMs: { type: Number, default: 0 },
    startedAt: Date,
    doneAt: Date,
    note: { type: String, maxlength: 200 },
    threadId: { type: Schema.Types.ObjectId, ref: "Thread" },
  },
  { _id: false }
);

const LogSchema = new Schema<IMissionLog>({ at: { type: Date, required: true }, text: { type: String, required: true, maxlength: 240 } }, { _id: false });

const MissionSchema = new Schema<IMission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "", maxlength: 80 },
    day: { type: String, required: true },
    status: { type: String, enum: MISSION_STATUSES, default: "open" },
    tasks: { type: [TaskSchema], default: [] },
    endsAt: { type: Date, default: null },
    focusMs: { type: Number, default: 0 },
    focusedAt: { type: Date, default: null },
    askedAt: { type: Date, default: null },
    log: { type: [LogSchema], default: [] },
    fromId: { type: Schema.Types.ObjectId, ref: "Mission", default: null },
    endedAt: { type: Date, default: null },
    take: { type: String, default: "" },
  },
  { timestamps: true }
);

MissionSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export const MISSION_LOG_MAX = LOG_MAX;

export const Mission: Model<IMission> = mongoose.models.Mission ?? mongoose.model<IMission>("Mission", MissionSchema);
