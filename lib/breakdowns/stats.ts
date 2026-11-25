import { Types } from "mongoose";
import { CompanionMessage } from "@/lib/db/models/CompanionMessage";
import { Entry } from "@/lib/db/models/Entry";
import { Mission, type IMission } from "@/lib/db/models/Mission";
import { Moment } from "@/lib/db/models/Moment";
import { Reply } from "@/lib/db/models/Reply";
import { Thread, type IThread, type ThreadStatus } from "@/lib/db/models/Thread";
import { addDays, dateToDay, dayDiff, dayToDate, localDay } from "@/lib/companion/time";
import { focusedFor } from "@/lib/missions/core";
import { dayMoods, pageScale } from "@/lib/patterns/compute";
import type { BreakdownParts, BreakdownStats, BreakdownThread } from "@/lib/types";
import { habitGap, habitTimes } from "@/lib/companion/fields";

/*
 * What happened in a stretch of days, worked out from what the writer logged: threads (their
 * logs, statuses and numbers), habit days, pages, check-ins, moods and posts. No model is
 * involved, so the same stretch always gives the same breakdown.
 */


const ref = (t: IThread): BreakdownThread => ({ id: String(t._id), title: t.title, hue: (t.hue ?? 0) % 8, kind: t.kind });
const round = (n: number) => Math.round(n * 100) / 100;

export function emptyStats(): BreakdownStats {
  return {
    days: 0,
    active: [],
    done: [],
    moved: [],
    started: [],
    stuck: [],
    habits: [],
    numbers: [],
    pages: { days: [], words: 0 },
    moods: [],
    people: { moments: 0, replies: 0 },
    open: 0,
    energies: [],
    answers: [],
    lists: { made: 0, tasks: 0, done: 0, focusMs: 0 },
  };
}

/**
 * The days a habit was done: the ones recorded, and days it logged a number. A daily habit's
 * run from before done days were recorded is laid out from its streak, but only before the first
 * recorded day: after that the record is the truth, and a "3x a week" habit's run has rest days in it.
 */
export function habitDays(t: IThread, tz: string): Set<string> {
  const days = new Set(t.doneDays ?? []);
  if (t.streak > 0 && habitGap(t.title) === 1) {
    const first = [...days].sort()[0];
    const last = localDay(tz, t.lastTouchedAt);
    for (let i = 0; i < Math.min(t.streak, 400); i++) {
      const d = addDays(last, -i);
      if (!first || d < first) days.add(d);
    }
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
  const [threads, entries, moods, talked, moments, replies, lists] = await Promise.all([
    Thread.find({ userId: id, archived: false }).lean<IThread[]>(),
    // Of all a page holds, only its mood, energy and numbers: a year of long answers stays behind.
    Entry.aggregate<{ date: Date; wordCount?: number; fields: { type: string; label: string; value?: unknown }[] }>([
      { $match: { userId: id, date: { $gte: dayToDate(from), $lte: dayToDate(upTo) } } },
      { $project: { date: 1, wordCount: 1, fields: { $filter: { input: "$fields", cond: { $in: ["$$this.type", ["mood_slider", "energy", "number"]] } } } } },
    ]),
    CompanionMessage.find({ userId: id, from: "you", mood: { $ne: null }, day: { $gte: from, $lte: upTo } })
      .sort({ createdAt: 1 })
      .select("day mood")
      .lean<{ day: string; mood: number }[]>(),
    CompanionMessage.distinct("day", { userId: id, from: "you", day: { $gte: from, $lte: upTo } }).exec() as Promise<string[]>,
    Moment.find({ userId: id, createdAt: { $gte: since, $lt: until } }).select("createdAt").lean<{ createdAt: Date }[]>(),
    Reply.find({ userId: id, createdAt: { $gte: since, $lt: until } }).select("createdAt").lean<{ createdAt: Date }[]>(),
    Mission.find({ userId: id, day: { $gte: from, $lte: upTo } })
      .select("day tasks.status tasks.doneAt focusMs focusedAt")
      .lean<Pick<IMission, "day" | "tasks" | "focusMs" | "focusedAt">[]>(),
  ]);

  const active = new Set<string>(talked);
  const pageDays = new Set<string>();
  let words = 0;
  for (const e of entries) {
    pageDays.add(dateToDay(e.date));
    words += e.wordCount ?? 0;
  }
  pageDays.forEach((d) => active.add(d));
  const written = entries.map((e) => ({ day: dateToDay(e.date), fields: e.fields ?? [] }));
  const moodByDay = dayMoods(moods, written);
  const energies = written.flatMap((p) => {
    const energy = pageScale(p.fields, "energy");
    return energy === null ? [] : [{ day: p.day, energy }];
  });
  // A page's own numbers, by the question's wording: the same question on another layout is the same number.
  const answers = new Map<string, { label: string; values: { day: string; value: number }[] }>();
  for (const p of written) {
    for (const f of p.fields) {
      const label = (f.label ?? "").trim();
      if (f.type !== "number" || typeof f.value !== "number" || !Number.isFinite(f.value) || !label) continue;
      const a = answers.get(label.toLowerCase()) ?? { label, values: [] };
      a.values.push({ day: p.day, value: f.value });
      answers.set(label.toLowerCase(), a);
    }
  }
  // A task done on a list is something logged that day.
  for (const m of lists) for (const t of m.tasks) if (t.status === "done" && t.doneAt && inside(dayOf(t.doneAt))) active.add(dayOf(t.doneAt));
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
      // What the habit asked for in the stretch: every day for a daily one, "3x a week" three in seven.
      const of = Math.ceil(((dayDiff(upTo, since) + 1 - (going && !did.includes(going) ? 1 : 0)) * habitTimes(t.title)) / 7);
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
  stats.energies = energies.sort((a, b) => a.day.localeCompare(b.day));
  stats.answers = [...answers.values()].map((a) => {
    const values = a.values.sort((x, y) => x.day.localeCompare(y.day));
    const total = round(values.reduce((n, v) => n + v.value, 0));
    return { label: a.label, days: values.length, average: round(total / values.length), total, values };
  });
  const now = Date.now();
  stats.lists = {
    made: lists.length,
    tasks: lists.reduce((n, m) => n + m.tasks.length, 0),
    done: lists.reduce((n, m) => n + m.tasks.filter((t) => t.status === "done").length, 0),
    focusMs: lists.reduce((n, m) => n + focusedFor({ focusMs: m.focusMs ?? 0, focusedAt: m.focusedAt ?? undefined }, now), 0),
  };
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
    habits: s.habits.length ? s.habits.reduce((n, h) => n + Math.min(1, h.days.length / h.of), 0) / s.habits.length : null,
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
