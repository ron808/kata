import mongoose, { Schema, type Model } from "mongoose";

export interface IEntryField {
  fieldId: string;
  type: string;
  label: string;
  value: unknown;
}

export interface IEntry {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  date: Date;
  fields: IEntryField[];
  wordCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EntryFieldSchema = new Schema<IEntryField>(
  {
    fieldId: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const EntrySchema = new Schema<IEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },
    date: { type: Date, required: true },
    fields: [EntryFieldSchema],
    wordCount: { type: Number, default: 0 },
    tags: [{ type: String, index: true }],
  },
  { timestamps: true }
);

EntrySchema.index({ userId: 1, date: -1 }, { unique: true });
EntrySchema.index({ userId: 1, tags: 1 });

export const Entry: Model<IEntry> =
  mongoose.models.Entry ?? mongoose.model<IEntry>("Entry", EntrySchema);
