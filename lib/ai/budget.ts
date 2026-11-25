import { User } from "@/lib/db/models/User";

/**
 * Model calls one writer can start in a day, across chat rounds, page reads, takes and wording.
 * A busy day of talking to Maru is about 60; the shared free key allows about 1,000 a model, so
 * one account (or a script with its session) can't spend it for everyone.
 */
export const MODEL_CALLS_A_DAY = 150;

/** The writer has had a day's worth of model calls: the caller does without, as when Groq is busy. */
export class OverBudget extends Error {
  constructor() {
    super("The day's model calls are spent for this writer.");
    this.name = "OverBudget";
  }
}

/** Counts one model call for the writer (by UTC day), or says no once they've had a day's worth. */
export async function spendModelCall(userId: string): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const res = await User.updateOne(
    { _id: userId, $or: [{ modelDay: { $ne: day } }, { modelCalls: { $lt: MODEL_CALLS_A_DAY } }] },
    [{ $set: { modelCalls: { $cond: [{ $eq: ["$modelDay", day] }, { $add: [{ $ifNull: ["$modelCalls", 0] }, 1] }, 1] }, modelDay: day } }],
    { updatePipeline: true }
  );
  return res.modifiedCount === 1;
}
