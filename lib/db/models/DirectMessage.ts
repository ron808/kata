import mongoose, { Schema, type Model } from "mongoose";

/** One message from one person to another, in their conversation. */
export interface IDirectMessage {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  from: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export const MESSAGE_MAX = 2000;

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: MESSAGE_MAX },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

DirectMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const DirectMessage: Model<IDirectMessage> =
  mongoose.models.DirectMessage ?? mongoose.model<IDirectMessage>("DirectMessage", DirectMessageSchema);
