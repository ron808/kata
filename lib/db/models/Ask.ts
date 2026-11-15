import mongoose, { Schema, type Model } from "mongoose";

/*
 * Something the writer asked to be asked about at a time: "ask me about calling Mum tonight".
 * Kata sends nothing outside the app, so it waits for them: it comes up as Maru's message the first
 * time they're in Kata after `at`, with taps to settle it (lib/companion/asks.ts). The earliest one
 * waiting is kept on the user (`nextAskAt`), so the app knows when to look without checking.
 */

export const ASK_STATUSES = ["waiting", "asked", "done", "dropped"] as const;
export type AskStatus = (typeof ASK_STATUSES)[number];

export interface IAsk {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** What to ask about, in their words: "call Mum". */
  text: string;
  /** From when it can come up. */
  at: Date;
  status: AskStatus;
  /** When it came up, and the message it came up in. */
  askedAt: Date | null;
  messageId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AskSchema = new Schema<IAsk>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 120 },
    at: { type: Date, required: true },
    status: { type: String, enum: ASK_STATUSES, default: "waiting" },
    askedAt: { type: Date, default: null },
    messageId: { type: Schema.Types.ObjectId, ref: "CompanionMessage", default: null },
  },
  { timestamps: true }
);

AskSchema.index({ userId: 1, status: 1, at: 1 });

export const Ask: Model<IAsk> = mongoose.models.Ask ?? mongoose.model<IAsk>("Ask", AskSchema);
