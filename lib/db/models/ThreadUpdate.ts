import mongoose, { Schema, type Model } from "mongoose";
import { REACTION_KINDS, type ReactionKind } from "./Moment";
import { THREAD_STATUSES, type ThreadStatus } from "./Thread";

/**
 * Something added to a shared thread, seen by its writer and everyone it's shared with: an update
 * in someone's words, where it stands now (a step its writer set, with no words, since a thread's
 * own notes stay private), or a line about who it's shared with. Updates carry their comments and
 * cheers, so a thread's page is one query.
 */

export const UPDATE_KINDS = ["update", "note"] as const;
export const NOTE_KINDS = ["shared", "unshared", "private", "left"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const UPDATE_MAX = 280;
export const COMMENT_MAX = 200;
export const COMMENTS_MOST = 50;

export interface IUpdateComment {
  _id: mongoose.Types.ObjectId;
  by: mongoose.Types.ObjectId;
  text: string;
  at: Date;
}

export interface IThreadUpdate {
  _id: mongoose.Types.ObjectId;
  threadId: mongoose.Types.ObjectId;
  /** Whose thread it is. */
  ownerId: mongoose.Types.ObjectId;
  /** Who wrote it, or did what a note says. */
  by: mongoose.Types.ObjectId;
  kind: (typeof UPDATE_KINDS)[number];
  /** An update's words; empty when it's only a step. */
  text: string;
  /** A step the thread's writer set. */
  status: ThreadStatus | null;
  /** A habit's step: the local day it counted. */
  day: string | null;
  /** A note: what happened, and to whom. */
  what: NoteKind | null;
  people: mongoose.Types.ObjectId[];
  comments: IUpdateComment[];
  cheers: { by: mongoose.Types.ObjectId; kind: ReactionKind }[];
  createdAt: Date;
}

const CommentSchema = new Schema<IUpdateComment>({
  by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, maxlength: COMMENT_MAX },
  at: { type: Date, default: Date.now },
});

const ThreadUpdateSchema = new Schema<IThreadUpdate>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: "Thread", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: UPDATE_KINDS, required: true },
    text: { type: String, default: "", maxlength: UPDATE_MAX },
    status: { type: String, enum: [...THREAD_STATUSES, null], default: null },
    day: { type: String, default: null },
    what: { type: String, enum: [...NOTE_KINDS, null], default: null },
    people: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    comments: { type: [CommentSchema], default: [] },
    cheers: {
      type: [new Schema({ by: { type: Schema.Types.ObjectId, ref: "User", required: true }, kind: { type: String, enum: REACTION_KINDS, required: true } }, { _id: false })],
      default: [],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ThreadUpdateSchema.index({ threadId: 1, createdAt: -1 });
// What someone added, for when their account goes.
ThreadUpdateSchema.index({ by: 1 });
ThreadUpdateSchema.index({ ownerId: 1 });

export const ThreadUpdate: Model<IThreadUpdate> =
  mongoose.models.ThreadUpdate ?? mongoose.model<IThreadUpdate>("ThreadUpdate", ThreadUpdateSchema);
