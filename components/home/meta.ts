import { valueText } from "@/lib/companion/fields";
import { dayDiff, localDay, weekdayOf } from "@/lib/companion/time";
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

/** A few words about a thread for the map and its cards: a due day, a streak, how long it's been stuck. */
export function threadMeta(t: ThreadT, today: string, tz: string): string {
  if (t.status === "done") return "Done";
  if (t.status === "paused") return "Paused";
  if (t.status === "stuck" || t.status === "waiting") {
    const d = dayDiff(today, sinceDay(t, tz));
    const word = t.status === "stuck" ? "Stuck" : "Waiting";
    return d <= 0 ? `${word} since today` : `${word} ${n(d, "day")}`;
  }
  if (t.dueAt) {
    const due = t.dueAt.slice(0, 10);
    const d = dayDiff(due, today);
    if (d < 0) return "Passed";
    if (d === 0) return "Today";
    if (d === 1) return "Tomorrow";
    if (d < 7) return weekdayOf(due);
    return `In ${d} days`;
  }
  if (t.kind === "habit" && t.streak > 1) return `${t.streak}-day streak`;
  return touchedPhrase(t.lastTouchedAt, today, tz);
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
export function metaWithToday(t: ThreadT, today: string, tz: string): string {
  const meta = threadMeta(t, today, tz);
  const line = todayLine(t, today);
  return line ? (meta === "Today" ? line : `${meta} · ${line}`) : meta;
}

/** Threads that belong on the map: what's still on your mind. */
export function onYourMind(threads: ThreadT[], max = 6): ThreadT[] {
  return threads.filter((t) => t.status !== "done" && t.status !== "paused").slice(0, max);
}
