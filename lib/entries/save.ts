import { Entry } from "@/lib/db/models/Entry";
import { User } from "@/lib/db/models/User";
import { isKataFieldId, parseKataFieldId } from "@/lib/questions/daily";
import type { EntryField } from "@/lib/types";
import { todayIn, validTimeZone } from "@/lib/companion/time";
import { toUtcMidnight } from "@/lib/utils/dates";
import { countWords, streakFromDates } from "@/lib/utils/streaks";

const MAX_WORDS = 5000;

/** A save the writer can fix (a bad date, too many words), with the status to answer with. */
export class PageError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export interface SavedPage {
  _id: string;
  date: Date;
  wordCount: number;
  tags: string[];
  created: boolean;
  /** The fields before this save, for Kata to see what changed. */
  previousFields: EntryField[] | null;
}

/** Something was written or chosen: an empty answer is no answer. */
function answered(value: EntryField["value"]): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

/**
 * Writes a day's page and keeps the writer's totals and streak honest. The one place a page
 * is saved: the page itself (POST /api/entries) and Maru writing on it both come through here.
 */
export async function savePage(userId: string, input: { fields: EntryField[]; date?: string }): Promise<SavedPage> {
  const user = await User.findById(userId).lean();
  if (!user) throw new PageError("User not found", 404);
  const today = todayIn(validTimeZone(user.timezone));
  const date = input.date ? toUtcMidnight(input.date) : today;
  if (date.getTime() > today.getTime()) throw new PageError("Cannot create an entry in the future.", 400);
  if (!user.activeTemplateId) throw new PageError("No active template — finish onboarding first.", 400);

  const existing = await Entry.findOne({ userId, date });
  const previousFields = existing
    ? existing.fields.map((f) => ({ fieldId: f.fieldId, type: f.type, label: f.label, value: f.value }) as EntryField)
    : null;
  // Answers to questions the page no longer asks (they switched to another page today) stay:
  // a page only loses what its writer clears. Kata's questions are sent whole, so they don't.
  const sent = new Set(input.fields.map((f) => f.fieldId));
  const kept = (previousFields ?? []).filter((f) => !sent.has(f.fieldId) && !isKataFieldId(f.fieldId) && answered(f.value));
  const fields = [...input.fields, ...kept];

  const wordCount = fields.reduce((sum, f) => (typeof f.value === "string" ? sum + countWords(f.value) : sum), 0);
  if (wordCount > MAX_WORDS) throw new PageError(`Entry exceeds ${MAX_WORDS} words.`, 400);

  // An answered Kata question (fieldId kata:<tag>:<questionId>) files the page under its tag.
  const kataTags = fields.flatMap((f) => {
    const kata = f.type === "long_text" && typeof f.value === "string" && f.value.trim() ? parseKataFieldId(f.fieldId) : null;
    return kata ? [kata.tag] : [];
  });
  const tags = Array.from(
    new Set(
      fields
        .filter((f) => f.type === "tags" && Array.isArray(f.value))
        .flatMap((f) => f.value as string[])
        .concat(kataTags)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 30);

  const previousWordCount = existing?.wordCount ?? 0;

  let entry;
  if (existing) {
    existing.fields = fields;
    existing.wordCount = wordCount;
    existing.tags = tags;
    await existing.save();
    entry = existing;
  } else {
    entry = await Entry.create({ userId, templateId: user.activeTemplateId, date, fields, wordCount, tags });
  }

  if (!existing) {
    const days = await Entry.find({ userId }).select("date").sort({ date: -1 }).limit(400).lean();
    const streak = streakFromDates(days.map((d) => d.date), today);
    await User.findByIdAndUpdate(userId, {
      $inc: { totalEntries: 1, totalWords: wordCount },
      $set: { streak, longestStreak: Math.max(user.longestStreak, streak), lastEntryDate: days[0]?.date ?? date },
    });
  } else if (wordCount !== previousWordCount) {
    await User.findByIdAndUpdate(userId, { $inc: { totalWords: wordCount - previousWordCount } });
  }

  return { _id: String(entry._id), date: entry.date, wordCount: entry.wordCount, tags: entry.tags, created: !existing, previousFields };
}
