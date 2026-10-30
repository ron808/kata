import { Types } from "mongoose";
import { CompanionMessage } from "@/lib/db/models/CompanionMessage";
import { Entry } from "@/lib/db/models/Entry";
import { Moment } from "@/lib/db/models/Moment";
import { Reply } from "@/lib/db/models/Reply";
import { Thread, type IThread, type ThreadStatus } from "@/lib/db/models/Thread";
import { addDays, dateToDay, dayDiff, dayToDate, localDay } from "@/lib/companion/time";
import type { BreakdownParts, BreakdownStats, BreakdownThread } from "@/lib/types";

/*
 * What happened in a stretch of days, worked out from what the writer logged: threads (their
 * logs, statuses and numbers), habit days, pages, check-ins, moods and posts. No model is
 * involved, so the same stretch always gives the same breakdown.
 */


const ref = (t: IThread): BreakdownThread => ({ id: String(t._id), title: t.title, hue: (t.hue ?? 0) % 8, kind: t.kind });
const round = (n: number) => Math.round(n * 100) / 100;

export function emptyStats(): BreakdownStats {
  return { days: 0, active: [], done: [], moved: [], started: [], stuck: [], habits: [], numbers: [], pages: { days: [], words: 0 }, moods: [], people: { moments: 0, replies: 0 }, open: 0 };
}

/** The days a habit was done: the ones recorded, the run its streak ends on, and days it logged a number. */
function habitDays(t: IThread, tz: string): Set<string> {
  const days = new Set(t.doneDays ?? []);
  if (t.streak > 0) {
    const last = localDay(tz, t.lastTouchedAt);
    for (let i = 0; i < Math.min(t.streak, 400); i++) days.add(addDays(last, -i));
  }
  for (const f of t.fields ?? []) for (const d of f.days ?? []) if (d.value > 0) days.add(d.day);
  return days;
}

/** A thread's status at the end of a day: its last change by then (logs keep the changes). */
function statusBy(t: IThread, day: string, tz: string): ThreadStatus | null {
  if (localDay(tz, t.createdAt) > day) return null;
  const changes = (t.log ?? []).filter((l) => l.status);
  if (!changes.length) return t.status;
  return changes.filter((l) => localDay(tz, l.at) <= day).at(-1)?.status ?? "moving";
}

/**
 * Everything that happened from `from` to `upTo` (local days, both included) in the writer's
 * time zone. Today isn't over, so it only counts (for showing up, or a habit) once something
 * happened in it.
 */
export async function gather(userId: string, tz: string, from: string, upTo: string, today: string): Promise<BreakdownStats> {
  if (from > upTo) return emptyStats();
  const inside = (day: string) => day >= from && day <= upTo;
  const going = upTo === today ? today : null;
  const dayOf = (d: Date) => localDay(tz, d);
  const id = new Types.ObjectId(userId);
  // Instants around the stretch, wide enough for any time zone; each is then checked by its local day.
  const since = dayToDate(addDays(from, -1));
  const until = dayToDate(addDays(upTo, 2));
  const [threads, entries, moods, talked, moments, replies] = await Promise.all([
    Thread.find({ userId: id, archived: false }).lean<IThread[]>(),
    Entry.find({ userId: id, date: { $gte: dayToDate(from), $lte: dayToDate(upTo) } })
      .select("date wordCount")
      .lean<{ date: Date; wordCount?: number }[]>(),
    CompanionMessage.find({ userId: id, from: "you", mood: { $ne: null }, day: { $gte: from, $lte: upTo } })
      .sort({ createdAt: 1 })
      .select("day mood")
      .lean<{ day: string; mood: number }[]>(),
    CompanionMessage.distinct("day", { userId: id, from: "you", day: { $gte: from, $lte: upTo } }).exec() as Promise<string[]>,
    Moment.find({ userId: id, createdAt: { $gte: since, $lt: until } }).select("createdAt").lean<{ createdAt: Date }[]>(),
    Reply.find({ userId: id, createdAt: { $gte: since, $lt: until } }).select("createdAt").lean<{ createdAt: Date }[]>(),
  ]);

  const active = new Set<string>(talked);
  const pageDays = new Set<string>();
  let words = 0;
  for (const e of entries) {
    pageDays.add(dateToDay(e.date));
    words += e.wordCount ?? 0;
  }
  pageDays.forEach((d) => active.add(d));
  // The day's last answer.
  const moodByDay = new Map(moods.map((m) => [m.day, m.mood]));
  const posted = [...moments, ...replies].map((p) => dayOf(p.createdAt)).filter(inside);
  posted.forEach((d) => active.add(d));

  const stats = emptyStats();
  for (const t of threads) {
    const created = dayOf(t.createdAt);
    if (created > upTo) continue;
    const logs = (t.log ?? []).filter((l) => inside(dayOf(l.at)));
    logs.forEach((l) => active.add(dayOf(l.at)));
    // The entry made with the thread is it starting, not an update.
    const updates = logs.filter((l) => Math.abs(new Date(l.at).getTime() - new Date(t.createdAt).getTime()) > 10_000);
    if (inside(created)) {
      stats.started.push(ref(t));
      active.add(created);
    }

    const values = (t.fields ?? [])
      .filter((f) => f.type === "number")
      .map((f) => ({ f, days: (f.days ?? []).filter((d) => inside(d.day)) }))
      .filter((v) => v.days.length);
    for (const { f, days } of values) {
      days.forEach((d) => active.add(d.day));
      stats.numbers.push({
        thread: ref(t),
        label: f.label,
        unit: f.unit,
        total: round(days.reduce((n, d) => n + d.value, 0)),
        days: days.length,
        goal: f.goal ?? null,
        hit: f.goal ? days.filter((d) => d.value >= f.goal!).length : 0,
        values: days.map((d) => ({ day: d.day, value: d.value })),
      });
    }

    if (t.kind === "habit") {
      const did = [...habitDays(t, tz)].filter(inside).sort();
      did.forEach((d) => active.add(d));
      const since = created > from ? created : from;
      const of = dayDiff(upTo, since) + 1 - (going && !did.includes(going) ? 1 : 0);
      if (of > 0 && (did.length || t.status !== "paused")) stats.habits.push({ ...ref(t), days: did, of, since });
      continue;
    }

    const doneLogs = (t.log ?? []).filter((l) => l.status === "done");
    // Done before the log kept changes: the last time it was touched.
    const finished = logs.some((l) => l.status === "done") || (t.status === "done" && !doneLogs.length && inside(dayOf(t.lastTouchedAt)));
    if (!finished && statusBy(t, addDays(from, -1), tz) === "done") continue;
    stats.open++;
    if (finished) {
      stats.done.push(ref(t));
      continue;
    }
    const stuck = statusBy(t, upTo, tz) === "stuck";
    if (stuck) stats.stuck.push(ref(t));
    const touched = updates.length + values.reduce((n, v) => n + v.days.length, 0);
    if (touched && !stuck) stats.moved.push({ ...ref(t), updates: touched });
  }

  stats.days = dayDiff(upTo, from) + 1 - (going && !active.has(going) ? 1 : 0);
  stats.active = [...active].filter(inside).sort();
  stats.moved.sort((a, b) => b.updates - a.updates);
  stats.pages = { days: [...pageDays].sort(), words };
  stats.moods = [...moodByDay].map(([day, mood]) => ({ day, mood })).sort((a, b) => a.day.localeCompare(b.day));
  stats.people = { moments: moments.filter((m) => inside(dayOf(m.createdAt))).length, replies: replies.filter((r) => inside(dayOf(r.createdAt))).length };
  return stats;
}

const WEIGHTS: [keyof BreakdownParts, number][] = [
  ["showingUp", 0.35],
  ["progress", 0.4],
  ["habits", 0.25],
];

/**
 * A score out of 10 from three parts, each 0–1: the share of days they showed up, how many
 * of their open threads moved (finishing counts most; a week asks four things of them, longer
 * stretches more), and the share of days their habits were kept. A part with nothing to
 * judge it by is left out. No score at all when nothing happened.
 */
export function scoreOf(s: BreakdownStats): { score: number | null; parts: BreakdownParts } {
  const enough = Math.min(s.open, s.days <= 10 ? 4 : s.days <= 45 ? 6 : 8);
  const parts: BreakdownParts = {
    showingUp: s.days > 0 ? s.active.length / s.days : null,
    progress: enough > 0 ? Math.min(1, (s.done.length + 0.6 * s.moved.length) / enough) : null,
    habits: s.habits.length ? s.habits.reduce((n, h) => n + h.days.length / h.of, 0) / s.habits.length : null,
  };
  if (!s.active.length && !s.done.length) return { score: null, parts };
  let sum = 0;
  let weight = 0;
  for (const [key, w] of WEIGHTS) {
    const v = parts[key];
    if (v === null) continue;
    sum += v * w;
    weight += w;
  }
  return { score: weight ? Math.max(1, Math.min(10, Math.round(1 + (9 * sum) / weight))) : null, parts };
}
