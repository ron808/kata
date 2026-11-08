import mongoose, { Schema, type Model } from "mongoose";

/** One message from one person to another, in their conversation: words, or one of Kata's stickers. */
export interface IDirectMessage {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  from: mongoose.Types.ObjectId;
  text: string;
  /** A sticker's id from `lib/stickers.ts`, instead of words. Nothing is uploaded: the stickers are Kata's own. */
  sticker: string | null;
  createdAt: Date;
}

export const MESSAGE_MAX = 2000;

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "", trim: true, maxlength: MESSAGE_MAX },
    sticker: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

DirectMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const DirectMessage: Model<IDirectMessage> =
  mongoose.models.DirectMessage ?? mongoose.model<IDirectMessage>("DirectMessage", DirectMessageSchema);
