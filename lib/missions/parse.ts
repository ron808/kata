import { capFirst } from "@/lib/companion/text";
import { addDays, clockIn, localDay, momentOn } from "@/lib/companion/time";

/**
 * Tasks as people say them: "Gym at 6pm for 45 min". The times come out in code, so the model
 * only has to pass the words along, a tool definition stays short, and a message with no model
 * at all makes the same list.
 */

export interface When {
  /** The writer's day the list is for. */
  day: string;
  now: Date;
  tz: string;
}

export interface ParsedTask {
  title: string;
  at: Date | null;
  minutes: number | null;
}

const HOURS = "(?:hours?|hrs?|h)";
const MINUTES = "(?:minutes?|mins?)";
const LEAD = "(?:for\\s+|takes?\\s+|about\\s+|around\\s+|~\\s*)*";

const DURATIONS: [RegExp, (m: RegExpMatchArray) => number][] = [
  // 1h30, 1h 30m, 1 hour and 30 minutes
  [new RegExp(`(?<![\\w.])${LEAD}(\\d+)\\s*${HOURS}\\s*(?:and\\s+)?(\\d{1,2})\\s*(?:${MINUTES}|m)?(?![\\w])`, "i"), (m) => Number(m[1]) * 60 + Number(m[2])],
  [new RegExp(`(?<![\\w.])${LEAD}(\\d+(?:\\.\\d+)?)\\s*${HOURS}(?![\\w])`, "i"), (m) => Math.round(Number(m[1]) * 60)],
  [new RegExp(`(?<![\\w.])${LEAD}(\\d+)\\s*${MINUTES}(?![\\w])`, "i"), (m) => Number(m[1])],
  [/\b(?:for\s+)?(?:an?|one)\s+hour\s+and\s+a\s+half\b/i, () => 90],
  [/\b(?:for\s+)?(?:half\s+an\s+hour|a\s+half\s+hour|thirty\s+minutes)\b/i, () => 30],
  [/\b(?:for\s+)?(?:a\s+)?quarter\s+of\s+an\s+hour\b/i, () => 15],
  [/\b(?:for\s+)?(?:an?|one)\s+hour\b/i, () => 60],
  [/\b(?:for\s+)?(?:two|a\s+couple\s+of)\s+hours\b/i, () => 120],
  [/\b(?:for\s+)?three\s+hours\b/i, () => 180],
];

/** A length of time in the words, and the words without it. */
export function minutesIn(text: string): { minutes: number | null; rest: string } {
  for (const [re, read] of DURATIONS) {
    const m = text.match(re);
    if (!m) continue;
    const minutes = read(m);
    if (minutes > 0 && minutes <= 24 * 60) return { minutes, rest: text.replace(re, " ") };
  }
  return { minutes: null, rest: text };
}

const TIME = "(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?";
const END = "(?=[\\s,.;!?)]|$)";
const FROM_TO = new RegExp(`(?<![\\w:.-])(from\\s+)?${TIME}\\s*(?:-|–|—|to|until|till)\\s*${TIME}${END}`, "i");
const AT = new RegExp(`(?:\\b(?:at|by|around)\\s+|@\\s*)${TIME}${END}`, "i");
const WITH_MERIDIEM = /(?<![\w:.-])(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=[\s,.;!?)]|$)/i;
const CLOCK = /(?<![\w:.-])([01]?\d|2[0-3]):([0-5]\d)(?![\w:])/;
const NAMED = /\b(?:at\s+|by\s+|around\s+)?(noon|midday|midnight)\b/i;

const isPm = (word: string | undefined) => /^p/i.test(word ?? "");

/**
 * An hour said on a clock, on the writer's day, the way people mean it on a to-do list: "at 3"
 * in the afternoon is 3pm, "at 9" is whichever 9 comes next, and "at 1" late at night is 1am.
 */
function clockAt(hour: number, minute: number, meridiem: string | undefined, w: When): Date | null {
  if (minute > 59 || hour > 24) return null;
  if (meridiem) return hour > 12 ? null : momentOn(w.day, (hour % 12) + (isPm(meridiem) ? 12 : 0), minute, w.tz);
  if (hour > 12 || hour === 0) return momentOn(w.day, hour % 24, minute, w.tz);
  const h = hour % 12;
  // On a day still to come: 7 to 11 are the morning, 12 is noon, 1 to 6 the afternoon.
  if (w.day > localDay(w.tz, w.now)) return momentOn(w.day, h >= 7 ? h : h + 12, minute, w.tz);
  const [nowHour] = clockIn(w.tz, w.now);
  const late = nowHour >= 22 || nowHour < 4;
  // The small hours belong to the night before; 4am on is the next morning.
  const morning = (n: number) => (n < 4 ? momentOn(w.day, n, minute, w.tz) : momentOn(late && nowHour >= 4 ? addDays(w.day, 1) : w.day, n, minute, w.tz));
  if (hour === 12) {
    const noon = momentOn(w.day, 12, minute, w.tz);
    return noon > w.now ? noon : momentOn(w.day, 0, minute, w.tz);
  }
  if (h <= 6) {
    const am = morning(h);
    // Late at night, or an early bird within a few hours of it: the morning. Otherwise the afternoon.
    if (late || (am > w.now && am.getTime() - w.now.getTime() <= 3 * 3_600_000)) return am;
    return momentOn(w.day, h + 12, minute, w.tz);
  }
  const am = momentOn(w.day, h, minute, w.tz);
  const pm = momentOn(w.day, h + 12, minute, w.tz);
  if (am > w.now) return am;
  if (pm > w.now) return pm;
  return momentOn(addDays(w.day, 1), h, minute, w.tz);
}

/** A time in the words, how long it runs if they gave a range, and the words without it. */
export function timeIn(text: string, w: When): { at: Date | null; minutes: number | null; rest: string } {
  const range = text.match(FROM_TO);
  if (range && (range[1] || range[4] || range[7] || range[3] || range[6])) {
    const pm = range[4] ?? range[7];
    const start = clockAt(Number(range[2]), Number(range[3] ?? 0), range[4] ?? (Number(range[2]) <= Number(range[5]) ? pm : undefined), w);
    const end = clockAt(Number(range[5]), Number(range[6] ?? 0), range[7] ?? range[4], w);
    if (start && end && end > start) return { at: start, minutes: Math.round((end.getTime() - start.getTime()) / 60_000), rest: text.replace(FROM_TO, " ") };
  }
  for (const re of [AT, WITH_MERIDIEM]) {
    const m = text.match(re);
    if (!m) continue;
    const at = clockAt(Number(m[1]), Number(m[2] ?? 0), m[3], w);
    if (at) return { at, minutes: null, rest: text.replace(re, " ") };
  }
  const named = text.match(NAMED);
  if (named) {
    const at = momentOn(w.day, /midnight/i.test(named[1]) ? 0 : 12, 0, w.tz);
    return { at, minutes: null, rest: text.replace(NAMED, " ") };
  }
  const plain = text.match(CLOCK);
  if (plain) {
    const at = clockAt(Number(plain[1]), Number(plain[2]), undefined, w);
    if (at) return { at, minutes: null, rest: text.replace(CLOCK, " ") };
  }
  return { at: null, minutes: null, rest: text };
}

const FILLER = /^(?:(?:i\s+)?(?:need|have|want|got|must|should)(?:\s+to)?\s+|gotta\s+|i(?:['’]ll|\s+will)\s+|to\s+|then\s+|also\s+|and\s+|plus\s+|[-*•]\s+|\d+[.)]\s+)+/i;
const LEFT_OVER = /\s+(?:at|for|from|by|around|to|on)$/i;

function titleFrom(words: string): string {
  const tidy = words
    .replace(/\s+/g, " ")
    .replace(FILLER, "")
    .replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "")
    .replace(LEFT_OVER, "")
    .trim();
  return capFirst(tidy).slice(0, 120);
}

/** One task from its words. */
export function parseTask(raw: string, w: When): ParsedTask {
  const time = timeIn(raw, w);
  const length = minutesIn(time.rest);
  const title = titleFrom(length.rest);
  return { title: title || titleFrom(raw), at: time.at, minutes: length.minutes ?? time.minutes };
}

export function parseTasks(items: string[], w: When): ParsedTask[] {
  return items.map((item) => parseTask(item, w)).filter((t) => t.title);
}

/**
 * When the whole thing ends, from what they said: "2 hours", "18:00", "6pm", "2026-11-09".
 * A date means the end of that day, which turns at 4am.
 */
export function endsFrom(raw: string, w: When): Date | null {
  const said = raw.trim().replace(/^(?:until|till|til|to|by)\s+/i, "at ");
  if (!said) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(said)) return momentOn(said, 3, 59, w.tz);
  const time = timeIn(said, w);
  // An end that's already gone by can only mean the next one.
  if (time.at) return time.at > w.now ? time.at : new Date(time.at.getTime() + 86_400_000);
  const { minutes } = minutesIn(said);
  return minutes ? new Date(w.now.getTime() + minutes * 60_000) : null;
}

/** The same time of day on another writer's day, for running a list again. */
export function sameClock(at: Date, day: string, tz: string): Date {
  const [hour, minute] = clockIn(tz, at);
  return momentOn(day, hour, minute, tz);
}
