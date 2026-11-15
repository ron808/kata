import { habitGap } from "@/lib/companion/fields";
import { doneToday } from "@/lib/companion/steps";
import { addDays, clockIn, dayDiff, localDay, momentOn, weekdayOf } from "@/lib/companion/time";
import type { PlanRow, ThreadKind, ThreadT } from "@/lib/types";

/*
 * A day's plan, worked out in code from the writer's threads: what's due that day, what's past
 * its date, the habits their rhythm asks for, and the next steps on what's moving, in that
 * order, with times laid across the hours left. Kata can't see a calendar, so the times are
 * suggestions, written the way people say them ("Finish scrapers at 2:30pm for 60 min") and
 * read back by the same parser as any list. Nothing is made until the writer taps it.
 */

export type Why = "due" | "late" | "habit" | "next";

export interface Planned {
  title: string;
  why: Why;
  /** Why it's on the plan, in a few words: "Due today", "Was due Monday", "Next: send the deck". */
  because: string;
  threadId: string;
  hue: number;
  at: Date | null;
  minutes: number;
}


/** The most a day's plan holds: a day has only so many hours. */
export const PLAN_MOST = 6;
const BREAK = 15;
/** Nothing is planned to start later than this. */
const LAST_START = 22 * 60;
/** A day planned ahead starts here. */
const FIRST_START = 9 * 60;
/** Minutes a thing usually takes, by what kind of thing it is. */
const LENGTH: Record<ThreadKind, number> = { project: 60, task: 30, goal: 45, habit: 30, person: 15, event: 60, health: 30, learning: 45, other: 30 };

/**
 * The day a plan is for: "today", "tonight" and "this afternoon" mean today and "tomorrow"
 * tomorrow; said plainly, the rest of today until six, and after that the day ahead. Still up
 * before the day turns at four, any of them is the day ahead: "this afternoon" at 1am is the
 * one after they sleep.
 */
export function planDayFor(said: string, today: string, hour: number): string {
  if (hour < 4 || /\btomorrow\b/i.test(said)) return addDays(today, 1);
  if (/\b(?:today|tonight|this\s+(?:morning|afternoon|evening)|rest\s+of\s+(?:my|the)\s+day)\b/i.test(said)) return today;
  return hour >= 18 || hour < 4 ? addDays(today, 1) : today;
}

// "Plan my day", "plan tomorrow", "what's the plan for today?", "what should I do today?"
const PLAN_ASKED = new RegExp(
  [
    String.raw`^(?:(?:so|ok(?:ay)?|hey)[,\s]+)?(?:(?:can|could|will|would)\s+you\s+|please\s+|help\s+me\s+|let['’]?s\s+|i\s+(?:want|need)\s+to\s+)?(?:plan|schedule|organi[sz]e|map\s+out|lay\s+out|sort\s+out)\s+(?:out\s+)?(?:my|the)?\s*(?:rest\s+of\s+(?:my|the)\s+)?(?:day|today|tomorrow|evening|afternoon|morning)\b`,
    String.raw`\b(?:make|give|draw\s+up|put\s+together|work\s+out|come\s+up\s+with|figure\s+out|sort\s+out)\s+(?:me\s+)?a\s+plan\s+for\s+(?:today|tomorrow|tonight|the\s+day|my\s+day|the\s+rest\s+of\s+(?:my|the)\s+day|this\s+(?:morning|afternoon|evening))\b`,
    String.raw`^(?:so\s+)?what(?:['’]s|\s+is)\s+the\s+plan(?:\s+for\s+(?:today|tomorrow|tonight))?\s*[?.!]*$`,
    String.raw`^(?:so\s+)?what\s+should\s+i\s+(?:do|work\s+on|focus\s+on|start\s+with|get\s+done)\s+(?:today|tomorrow|first|now|this\s+(?:morning|afternoon|evening))\s*[?.!]*$`,
  ].join("|"),
  "i"
);

export const planAsked = (said: string) => PLAN_ASKED.test(said.trim());

/** How long a habit usually takes: its minutes goal, else the last time it logged minutes. */
function habitMinutes(t: ThreadT): number {
  const f = t.fields.find((x) => x.type === "number" && /^min/i.test(x.unit));
  const last = f?.days.at(-1)?.value ?? (typeof f?.value === "number" ? f.value : null);
  const minutes = f?.goal ?? last;
  return minutes && minutes > 0 && minutes <= 240 ? Math.round(minutes) : LENGTH.habit;
}

/** Whether a habit's rhythm asks for it on a day: every day, or after the rest "3x a week" allows. */
function habitDueOn(t: ThreadT, day: string, tz: string): boolean {
  if (t.streak <= 0) return true;
  const last = localDay(tz, new Date(t.lastTouchedAt));
  return dayDiff(day, last) >= habitGap(t.title);
}

/** The threads that belong on a day's plan, in the order they should go, before any times. */
export function planFor(threads: ThreadT[], o: { day: string; today: string; tz: string; taken?: (title: string) => boolean }): Omit<Planned, "at">[] {
  const live = threads.filter((t) => t.status !== "done" && t.status !== "paused" && !t.archived && !o.taken?.(t.title));
  const dated = (t: ThreadT) => (t.kind !== "habit" && t.dueAt ? t.dueAt.slice(0, 10) : null);
  const item = (t: ThreadT, why: Why, because: string, minutes = LENGTH[t.kind] ?? 30) => ({ title: t.title, why, because, threadId: t._id, hue: t.hue, minutes });
  const ahead = o.day !== o.today;
  const out: Omit<Planned, "at">[] = [];
  for (const t of live) if (dated(t) === o.day) out.push(item(t, "due", ahead ? "Due tomorrow" : "Due today"));
  const late = live
    .filter((t) => t.status !== "waiting" && dated(t) !== null && dated(t)! < o.day && dayDiff(o.day, dated(t)!) <= 7)
    .sort((a, b) => dated(a)!.localeCompare(dated(b)!));
  // Planning tomorrow in the evening, what was due today is "today", not its weekday.
  const was = (d: string) => (d === o.today ? "today" : d === addDays(o.today, -1) ? "yesterday" : weekdayOf(d));
  for (const t of late) out.push(item(t, "late", `Was due ${was(dated(t)!)}`));
  for (const t of live) {
    if (t.kind !== "habit" || !habitDueOn(t, o.day, o.tz) || (!ahead && doneToday(t, o.today, o.tz))) continue;
    out.push(item(t, "habit", habitGap(t.title) > 1 ? "Habit, on its day" : "Daily habit", habitMinutes(t)));
  }
  const moving = live
    .filter((t) => t.status === "moving" && t.nextStep && !dated(t) && !["habit", "person", "event"].includes(t.kind))
    .sort((a, b) => b.lastTouchedAt.localeCompare(a.lastTouchedAt))
    .slice(0, 2);
  for (const t of moving) out.push(item(t, "next", `Next: ${t.nextStep}`));
  return out.slice(0, PLAN_MOST);
}

/** Minutes after the day's midnight as a moment. Plans stop at ten, so it never runs past midnight. */
const momentAt = (day: string, minutes: number, tz: string) => momentOn(day, Math.floor(minutes / 60), minutes % 60, tz);

/**
 * The plan with times: today's from the next quarter hour at least ten minutes out, another
 * day's from nine, one after another with a short break, and nothing starting after ten at night.
 */
export function planDay(threads: ThreadT[], o: { day: string; today: string; now: Date; tz: string; taken?: (title: string) => boolean }): Planned[] {
  const [hour, minute] = clockIn(o.tz, o.now);
  // Before four it's still the night of the day before: one in the morning is minute 25 × 60.
  const now = (hour < 4 ? hour + 24 : hour) * 60 + minute;
  let at = o.day === o.today ? Math.ceil((now + 10) / 15) * 15 : FIRST_START;
  return planFor(threads, o).map((p) => {
    if (at > LAST_START) return { ...p, at: null };
    const planned = { ...p, at: momentAt(o.day, at, o.tz) };
    at = Math.ceil((at + p.minutes + BREAK) / 5) * 5;
    return planned;
  });
}

/** A clock time as the writer reads it: "2:30 pm", "9 am". */
export function clockSaid(at: Date, tz: string): string {
  const [hour, minute] = clockIn(tz, at);
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
}

/** A task in the words a list reads: "Finish scrapers at 2:30pm for 60 min". */
export function planLine(p: Planned, tz: string): string {
  return [p.title, p.at ? `at ${clockSaid(p.at, tz).replace(" ", "")}` : "", `for ${p.minutes} min`].filter(Boolean).join(" ");
}

export const planRow = (p: Planned, tz: string): PlanRow => ({ time: p.at ? clockSaid(p.at, tz) : "", title: p.title, minutes: p.minutes, because: p.because, hue: p.hue });

/** "1 h", "45 min", "1 h 30". */
export function lengthSaid(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m}` : ""}` : `${m} min`;
}
