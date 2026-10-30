import mongoose, { Schema, type Model } from "mongoose";
import type { BreakdownParts, BreakdownStats, PeriodUnit } from "@/lib/types";

export const BREAKDOWN_KINDS = ["weekly", "asked"] as const;
export type BreakdownKind = (typeof BREAKDOWN_KINDS)[number];

/**
 * How a stretch of time went for one writer, worked out in code from what they logged
 * (lib/breakdowns). Weekly ones come by themselves for the week before; asked ones (from Maru
 * or the Breakdowns page) go after thirty days unless kept.
 */
export interface IBreakdown {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  kind: BreakdownKind;
  /** The stretch, local days with both ends included. */
  from: string;
  to: string;
  unit: PeriodUnit;
  /** What was counted: from the later of `from` and the day they joined, up to the day it was made. */
  counted: string;
  upTo: string;
  score: number | null;
  parts: BreakdownParts;
  stats: BreakdownStats;
  /** The same point in the stretch before, for comparison. */
  previous: { from: string; upTo: string; score: number | null } | null;
  /** Maru's few sentences on it, written the first time it's opened. */
  take: string;
  takeAt: Date | null;
  /** Nothing happened in it: kept so it isn't worked out again, never listed. */
  empty: boolean;
  madeAt: Date;
  /** Asked ones go then; null for weekly ones and asked ones they kept. */
  expiresAt: Date | null;
}

const BreakdownSchema = new Schema<IBreakdown>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: BREAKDOWN_KINDS, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    unit: { type: String, enum: ["day", "week", "month", "year", "days"], required: true },
    counted: { type: String, required: true },
    upTo: { type: String, required: true },
    score: { type: Number, default: null, min: 1, max: 10 },
    parts: { type: Schema.Types.Mixed, default: {} },
    stats: { type: Schema.Types.Mixed, required: true },
    previous: { type: Schema.Types.Mixed, default: null },
    take: { type: String, default: "", maxlength: 800 },
    takeAt: { type: Date, default: null },
    empty: { type: Boolean, default: false },
    madeAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: false, minimize: false }
);

BreakdownSchema.index({ userId: 1, kind: 1, from: 1, to: 1 }, { unique: true });
BreakdownSchema.index({ userId: 1, empty: 1, madeAt: -1 });
// MongoDB removes a document once its expiresAt has passed; null never expires.
BreakdownSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Breakdown: Model<IBreakdown> = mongoose.models.Breakdown ?? mongoose.model<IBreakdown>("Breakdown", BreakdownSchema);
