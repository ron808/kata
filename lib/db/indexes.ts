import type { Model } from "mongoose";
import { Breakdown } from "./models/Breakdown";
import { CompanionMessage } from "./models/CompanionMessage";
import { Conversation } from "./models/Conversation";
import { Digest } from "./models/Digest";
import { DirectMessage } from "./models/DirectMessage";
import { Entry } from "./models/Entry";
import { Follow } from "./models/Follow";
import { Moment } from "./models/Moment";
import { Notification } from "./models/Notification";
import { PasswordResetToken } from "./models/PasswordResetToken";
import { Reaction } from "./models/Reaction";
import { Reply } from "./models/Reply";
import { Template } from "./models/Template";
import { Thread } from "./models/Thread";
import { User } from "./models/User";

export interface IndexReport {
  /** Indexes replaced because their schema asks for different rules now. */
  repaired: string[];
  /** Collections whose indexes still don't match their schema. */
  failed: string[];
}

// Every model: one left out here never gets its indexes checked.
const MODELS = [
  Breakdown,
  CompanionMessage,
  Conversation,
  Digest,
  DirectMessage,
  Entry,
  Follow,
  Moment,
  Notification,
  PasswordResetToken,
  Reaction,
  Reply,
  Template,
  Thread,
  User,
] as unknown as Model<unknown>[];

const sameKeys = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Mongo never changes an index: asked for the same keys with different rules, it refuses, and
 * mongoose tells nobody. The old rules then keep applying, whatever the schema says, until
 * something fails for writers (a sparse unique index, which stopped every new page once one
 * had no slug). So an index a schema has asked to change gets replaced here. Anything a schema
 * doesn't mention stays: this only ever replaces.
 */
async function repair(model: Model<unknown>, report: IndexReport) {
  const collection = model.collection.name;
  try {
    // Building what's missing is mongoose's job when a model loads: this waits for it.
    await model.init().catch(() => undefined);
    const { toDrop, toCreate } = await model.diffIndexes();
    if (!toCreate.length) return;
    const found = await model.collection.indexes();
    const stale = found.filter((i) => toDrop.includes(i.name ?? "") && toCreate.some((keys) => sameKeys(keys, i.key)));
    for (const index of stale) {
      await model.collection.dropIndex(index.name!);
      report.repaired.push(`${collection}.${index.name}`);
      console.warn("db:indexes replaced", collection, index.name);
    }
    await model.createIndexes();
    if ((await model.diffIndexes()).toCreate.length) report.failed.push(collection);
  } catch (err) {
    report.failed.push(collection);
    console.error("db:indexes", collection, err);
  }
}

/** Never throws: a failure is in the report and the logs, and the app carries on. */
export async function repairIndexes(): Promise<IndexReport> {
  const report: IndexReport = { repaired: [], failed: [] };
  // Previews share the live database, and may be trying out different indexes.
  if (process.env.VERCEL_ENV === "preview") return report;
  for (const model of MODELS) await repair(model, report);
  return report;
}
