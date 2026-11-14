import { habitGap, habitRun, valueText } from "@/lib/companion/fields";
import { doneToday } from "@/lib/companion/steps";
import { dayDiff, localDay, monthDayOf, weekdayOf } from "@/lib/companion/time";
import type { ThreadT } from "@/lib/types";

const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** The day the thread's current status began: the latest log entry that set it, else its last touch. */
function sinceDay(t: ThreadT, tz: string): string {
  const set = [...t.log].reverse().find((l) => l.status === t.status);
  return localDay(tz, new Date(set?.at ?? t.lastTouchedAt));
}

/** When it last came up, in a few words. */
export function touchedPhrase(iso: string, today: string, tz: string): string {
  const d = dayDiff(today, localDay(tz, new Date(iso)));
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "Last week";
  return "A while back";
}

export { stepOn, stepsFor } from "@/lib/companion/steps";

/** "Moving" says nothing about a habit or a person, so only their other states are worth a badge. */
export const showsStatus = (t: ThreadT) => t.status !== "moving" || (t.kind !== "habit" && t.kind !== "person");

/** A few words about a thread for the map and its cards: a due day, a streak, how long it's been stuck. */
export function threadMeta(t: ThreadT, today: string, tz: string, { due: said = false }: { due?: boolean } = {}): string {
  if (t.status === "done") return "Done";
  if (t.status === "paused") return "Paused";
  if (t.status === "stuck" || t.status === "waiting") {
    const d = dayDiff(today, sinceDay(t, tz));
    const word = t.status === "stuck" ? "Stuck" : "Waiting";
    return d <= 0 ? `${word} since today` : `${word} ${n(d, "day")}`;
  }
  // A habit goes by its rhythm, not a date.
  if (t.dueAt && t.kind !== "habit") {
    const due = t.dueAt.slice(0, 10);
    const d = dayDiff(due, today);
    // On the map the date sits under the name; in a sentence-sized place it says what it is.
    if (d < 0) return `${said ? "Was due" : "Was"} ${monthDayOf(due)}`;
    if (d === 0) return said ? "Due today" : "Today";
    if (d === 1) return said ? "Due tomorrow" : "Tomorrow";
    if (d < 7) return said ? `Due ${weekdayOf(due)}` : weekdayOf(due);
    return said ? `Due in ${d} days` : `In ${d} days`;
  }
  if (t.kind === "habit") {
    const alive = dayDiff(today, localDay(tz, new Date(t.lastTouchedAt))) <= habitGap(t.title) && t.streak > 1;
    return `${alive ? `${habitRun(t.streak, t.title)} · ` : ""}${doneToday(t, today, tz) ? "Done today" : "Not yet today"}`;
  }
  if (t.kind === "event") return "No date";
  return `Came up ${touchedPhrase(t.lastTouchedAt, today, tz).toLowerCase()}`;
}

/** What was logged on a thread today, in a few words: "30 min · 2 km today". Empty when nothing was. */
export function todayLine(t: ThreadT, today: string): string {
  const parts = t.fields.flatMap((f) => {
    const v = f.type === "number" ? f.days.find((d) => d.day === today)?.value : undefined;
    return v === undefined ? [] : [valueText(f, v)];
  });
  return parts.length ? `${parts.join(" · ")} today` : "";
}

/** threadMeta with today's numbers, which say "today" better than "Today" does. */
export function metaWithToday(t: ThreadT, today: string, tz: string, opts: { due?: boolean } = {}): string {
  const meta = threadMeta(t, today, tz, opts);
  const line = todayLine(t, today);
  return line ? (meta === "Today" || meta === "Came up today" ? line : `${meta} · ${line}`) : meta;
}

/** Threads that belong on the map: what's still on your mind. */
export function onYourMind(threads: ThreadT[], max = 6): ThreadT[] {
  return threads.filter((t) => !t.archived && t.status !== "done" && t.status !== "paused").slice(0, max);
}
