import mongoose, { Schema, type Model } from "mongoose";
import type { FieldType } from "@/lib/types";

export interface ITemplateField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  order: number;
  config: Record<string, unknown>;
}

export interface ITemplate {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  isPublished: boolean;
  publishedSlug: string | null;
  cloneCount: number;
  clonedFrom: mongoose.Types.ObjectId | null;
  tags: string[];
  fields: ITemplateField[];
  createdAt: Date;
  updatedAt: Date;
}

const FieldSchema = new Schema<ITemplateField>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const TemplateSchema = new Schema<ITemplate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    isPublished: { type: Boolean, default: false },
    publishedSlug: { type: String, default: null, unique: true, sparse: true },
    cloneCount: { type: Number, default: 0 },
    clonedFrom: {
      type: Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },
    tags: [{ type: String }],
    fields: [FieldSchema],
  },
  { timestamps: true }
);

TemplateSchema.index({ isPublished: 1, cloneCount: -1 });

export const Template: Model<ITemplate> =
  mongoose.models.Template ?? mongoose.model<ITemplate>("Template", TemplateSchema);
