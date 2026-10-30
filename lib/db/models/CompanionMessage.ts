import mongoose, { Schema, type Model } from "mongoose";

/** One line of the conversation between Kata and the writer. */
export const MESSAGE_KINDS = [
  "greeting",
  "mood",
  "checkin",
  "question",
  "reply",
  "note",
  "nudge",
] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export interface IQuickReply {
  label: string;
  value: string;
}

export const RECEIPT_KINDS = ["thread", "memory", "page", "question", "settings", "names", "people", "share", "message", "breakdown", "open"] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number];

/** Something Maru did, shown as a receipt under its message. */
export interface IReceipt {
  kind: ReceiptKind;
  /** What was done, in a few words: "Wrote on today's page". */
  text: string;
  /** The specifics: the words, the thread, the person. */
  detail: string;
  /** Where to see it. */
  href: string | null;
  /** The hue of the thread or person it's about. */
  hue: number | null;
}

export const INPUT_TYPES = ["text", "number", "date", "pick", "list"] as const;

/**
 * One thing a choice needs filled in, or lets the writer change, before it runs: it fills the
 * argument `key` ("title", "values.Minutes"). `list` is a few short items, comma-separated.
 */
export interface IChoiceInput {
  key: string;
  label: string;
  type: (typeof INPUT_TYPES)[number];
  /** Prefilled: what Maru was told or guessed. */
  value: string;
  /** pick: the options; text: ideas to tap. */
  options: { label: string; value: string }[];
  required: boolean;
  /** number: what it counts in. */
  unit: string;
  placeholder: string;
}

/** Something Maru offers to do. Tapping it runs `tool` with `args`, with no model involved. */
export interface IChoice {
  label: string;
  detail: string;
  kind: ReceiptKind;
  tool: string;
  args: Record<string, unknown>;
  /** The writer can change the words before it runs (a reply, a moment). */
  editable: boolean;
  /** Other people will see it. */
  public: boolean;
  /** A form: what it needs, or lets them change, before it runs. */
  inputs: IChoiceInput[];
  /** The form's button: "Track it". */
  action: string;
  /** An editable draft's longest length (a bio is 160); 0 for the usual 500. */
  max?: number;
}

export interface ICompanionMessage {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  from: "kata" | "you";
  kind: MessageKind;
  text: string;
  /** The thread this message is about, if any. */
  threadId: mongoose.Types.ObjectId | null;
  /** Quick answers Kata offers (Kata messages only). */
  replies: IQuickReply[];
  /** The quick reply value the writer chose, set on the Kata message it answers. */
  answer: string | null;
  /** 1–5 when the writer answers a mood check. */
  mood: number | null;
  /** What Maru did this turn. */
  done: IReceipt[];
  /** What Maru offers to do next; `answer` records the tap ("do:1", or "do:no" for not now). */
  choices: IChoice[];
  /** The writer's local calendar day, yyyy-mm-dd. */
  day: string;
  createdAt: Date;
}

const QuickReplySchema = new Schema<IQuickReply>(
  {
    label: { type: String, required: true, maxlength: 40 },
    value: { type: String, required: true, maxlength: 40 },
  },
  { _id: false }
);

const ReceiptSchema = new Schema<IReceipt>(
  {
    kind: { type: String, enum: RECEIPT_KINDS, required: true },
    text: { type: String, required: true, maxlength: 80 },
    detail: { type: String, default: "", maxlength: 240 },
    href: { type: String, default: null, maxlength: 200 },
    hue: { type: Number, default: null, min: 0, max: 7 },
  },
  { _id: false }
);

const ChoiceInputSchema = new Schema<IChoiceInput>(
  {
    key: { type: String, required: true, maxlength: 60 },
    label: { type: String, required: true, maxlength: 40 },
    type: { type: String, enum: INPUT_TYPES, required: true },
    value: { type: String, default: "", maxlength: 300 },
    options: {
      type: [new Schema({ label: { type: String, maxlength: 60 }, value: { type: String, maxlength: 60 } }, { _id: false })],
      default: [],
    },
    required: { type: Boolean, default: false },
    unit: { type: String, default: "", maxlength: 12 },
    placeholder: { type: String, default: "", maxlength: 60 },
  },
  { _id: false }
);

const ChoiceSchema = new Schema<IChoice>(
  {
    label: { type: String, required: true, maxlength: 60 },
    detail: { type: String, default: "", maxlength: 600 },
    kind: { type: String, enum: RECEIPT_KINDS, required: true },
    tool: { type: String, required: true, maxlength: 40 },
    args: { type: Schema.Types.Mixed, default: {} },
    editable: { type: Boolean, default: false },
    public: { type: Boolean, default: false },
    inputs: { type: [ChoiceInputSchema], default: [] },
    action: { type: String, default: "", maxlength: 24 },
    max: { type: Number, default: 0 },
  },
  { _id: false, minimize: false }
);

const CompanionMessageSchema = new Schema<ICompanionMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: String, enum: ["kata", "you"], required: true },
    kind: { type: String, enum: MESSAGE_KINDS, default: "note" },
    // Empty when the receipts say it all.
    text: { type: String, default: "", maxlength: 1000 },
    threadId: { type: Schema.Types.ObjectId, ref: "Thread", default: null },
    replies: { type: [QuickReplySchema], default: [] },
    answer: { type: String, default: null },
    mood: { type: Number, default: null, min: 1, max: 5 },
    done: { type: [ReceiptSchema], default: [] },
    choices: { type: [ChoiceSchema], default: [] },
    day: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

CompanionMessageSchema.index({ userId: 1, createdAt: -1 });
CompanionMessageSchema.index({ userId: 1, day: 1 });

export const CompanionMessage: Model<ICompanionMessage> =
  mongoose.models.CompanionMessage ??
  mongoose.model<ICompanionMessage>("CompanionMessage", CompanionMessageSchema);
