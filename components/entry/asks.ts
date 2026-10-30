import { isKataFieldId, kataFieldId, MAX_PAGE_QUESTIONS, parseKataFieldId } from "@/lib/questions/daily";
import type { DailyQuestion, EntryField } from "@/lib/types";
import { hueForTag } from "./hue";

/** One of Kata's questions on today's page, ready to render. */
export interface Ask {
  /** kata:<tag>:<questionId>, the field the answer is saved under. */
  fieldId: string;
  text: string;
  tag: string;
  hue: number;
  /** The title of the thread it's about, if any. */
  thread: string | null;
}

export interface ThreadLook {
  title: string;
  hue: number;
}

const answered = (f: EntryField) => typeof f.value === "string" && f.value.trim().length > 0;

/**
 * The question cards for today's page: today's questions in Kata's order, plus any question
 * answered earlier today that has since dropped off the list, so a saved answer is never lost.
 * Unanswered questions give way first when that goes over the limit the API accepts.
 */
export function buildAsks(
  questions: DailyQuestion[],
  saved: EntryField[] | undefined,
  threads: Record<string, ThreadLook>,
  tagHues?: Record<string, number>
): Ask[] {
  const savedKata = (saved ?? []).filter((f) => isKataFieldId(f.fieldId));
  const done = new Set(savedKata.filter(answered).map((f) => f.fieldId));

  const asks: Ask[] = questions.map((q) => {
    const t = q.threadId ? threads[q.threadId] : undefined;
    return {
      fieldId: kataFieldId(q),
      text: q.text,
      tag: q.tag,
      hue: t ? ((t.hue % 8) + 8) % 8 : hueForTag(q.tag, tagHues),
      thread: t?.title ?? null,
    };
  });

  for (const f of savedKata) {
    if (!done.has(f.fieldId) || asks.some((a) => a.fieldId === f.fieldId)) continue;
    const parsed = parseKataFieldId(f.fieldId);
    if (!parsed) continue;
    const t = parsed.threadId ? threads[parsed.threadId] : undefined;
    asks.push({
      fieldId: f.fieldId,
      text: f.label,
      tag: parsed.tag,
      hue: t ? ((t.hue % 8) + 8) % 8 : hueForTag(parsed.tag, tagHues),
      thread: t?.title ?? null,
    });
  }

  while (asks.length > MAX_PAGE_QUESTIONS) {
    const drop = asks.findLastIndex((a) => !done.has(a.fieldId));
    if (drop < 0) break;
    asks.splice(drop, 1);
  }
  return asks.slice(0, MAX_PAGE_QUESTIONS);
}
