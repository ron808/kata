import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { User, type IUser } from "@/lib/db/models/User";
import { isGroqConfigured } from "@/lib/ai/groq";
import { threadsFromEntry, type PageField } from "./extract";
import { applyCandidates, knownThreads, reconcilePage, type Ctx } from "./threads";
import { localDay, validTimeZone } from "./time";

export interface PageSnapshot {
  _id: string;
  fields: PageField[];
}

// With a model, a page is read on the writer's own save and at most every ten minutes while
// it autosaves, so a long session can't spend the free tier's per-minute tokens. Autosaves in
// between change nothing, which also keeps reconcilePage from undoing what the model found.
const MODEL_EVERY_MS = 10 * 60_000;
const lastModelRead = new Map<string, number>();

function sameWords(a: PageField[], b: PageField[]): boolean {
  const words = (fields: PageField[]) => JSON.stringify(fields.map((f) => [f.fieldId, f.value]));
  return words(a) === words(b);
}

/**
 * Brings threads up to date with a saved page. Runs after the response, and
 * the page autosaves while the writer types, so it's idempotent per page and
 * day: one log line per thread, rewritten in place, and threads that only a
 * half-typed phrase created are dropped again.
 */
export async function updateThreadsFromPage(
  userId: string,
  page: PageSnapshot,
  before: PageField[] | null,
  { final = false }: { final?: boolean } = {}
): Promise<void> {
  if (!final && before && sameWords(before, page.fields)) return;
  if (isGroqConfigured()) {
    if (!final && Date.now() - (lastModelRead.get(userId) ?? 0) < MODEL_EVERY_MS) return;
    lastModelRead.set(userId, Date.now());
  }
  await connectDB();
  const user = await User.findById(userId).select("timezone").lean<Pick<IUser, "timezone">>();
  const tz = validTimeZone(user?.timezone);
  const now = new Date();
  const ctx: Ctx = { userId, tz, now, day: localDay(tz, now) };
  const candidates = await threadsFromEntry(page, { known: await knownThreads(userId), today: ctx.day });
  const applied = await applyCandidates(ctx, candidates, { from: "page", source: "page" });
  const latest = await Entry.findOne({ userId }).sort({ date: -1 }).select("_id").lean();
  if (latest && String(latest._id) === page._id) await reconcilePage(ctx, applied.keys);
}
