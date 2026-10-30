import mongoose, { Schema, type Model } from "mongoose";

/**
 * Two people writing to each other. One per pair (`key` is both ids, sorted), with the latest
 * message kept on it so the list of conversations is one query.
 */
export interface IConversation {
  _id: mongoose.Types.ObjectId;
  /** Both people, sorted. */
  members: mongoose.Types.ObjectId[];
  key: string;
  lastText: string;
  lastFrom: mongoose.Types.ObjectId | null;
  lastAt: Date;
  /** Unread messages for each member, by user id. */
  unread: Map<string, number>;
  /** Members who blocked the other: no new messages reach them. */
  blockedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    key: { type: String, required: true },
    lastText: { type: String, default: "", maxlength: 200 },
    lastFrom: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastAt: { type: Date, default: Date.now },
    unread: { type: Map, of: Number, default: {} },
    blockedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

ConversationSchema.index({ key: 1 }, { unique: true });
ConversationSchema.index({ members: 1, lastAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ?? mongoose.model<IConversation>("Conversation", ConversationSchema);

/** One pair's key, whichever way round. */
export function conversationKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}
