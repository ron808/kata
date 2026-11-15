import type { Types } from "mongoose";
import {
  Thread,
  threadKey,
  type IThread,
  type IThreadField,
  type IThreadLog,
  type ThreadStatus,
} from "@/lib/db/models/Thread";
import { recordStep, type Stepped } from "@/lib/social/threadSteps";
import type { ThreadT } from "@/lib/types";
import type { KnownThread, ThreadCandidate } from "./extract";
import { FIELDS_MAX, fieldKey, habitGap, type FieldSpec } from "./fields";
import { isDuplicateKey } from "./messages";
import { addDays, dateToDay, dayDiff, localDay } from "./time";

export interface Ctx {
  userId: string;
  tz: string;
  day: string;
  now: Date;
}

const LOG_CAP = 40;
const DAY_MS = 86_400_000;

export function logItem(text: string, status: ThreadStatus | null, from: IThreadLog["from"], at: Date): IThreadLog {
  return { at, text: text.slice(0, 500), status, from };
}

export function withLog(log: IThreadLog[], item: IThreadLog): IThreadLog[] {
  return [...log, item].slice(-LOG_CAP);
}

/** A habit's streak if it's still alive (done today, or within the rest it allows), else 0. */
export function liveStreak(t: Pick<IThread, "kind" | "title" | "streak" | "lastTouchedAt">, ctx: Ctx): number {
  if (t.kind !== "habit" || t.streak <= 0) return 0;
  return dayDiff(ctx.day, localDay(ctx.tz, t.lastTouchedAt)) <= habitGap(t.title) ? t.streak : 0;
}

/**
 * A habit done on a day, today unless they say otherwise ("walked 30 min yesterday"). For habits
 * lastTouchedAt is the last day it was done, so the streak stays honest. Null when that day is
 * already counted. Pass the whole thread: the days it was done are kept from it, for breakdowns.
 */
export function habitDone(t: Pick<IThread, "title" | "streak" | "lastTouchedAt" | "touchCount" | "doneDays">, ctx: Ctx, day = ctx.day) {
  const last = t.streak > 0 ? localDay(ctx.tz, t.lastTouchedAt) : null;
  if (last === day || (t.doneDays ?? []).includes(day)) return null;
  // A day filled in late sits beside the run rather than at its end.
  const late = last !== null && day < last;
  const joins = last !== null && Math.abs(dayDiff(last, day)) <= habitGap(t.title);
  return {
    streak: joins ? t.streak + 1 : late ? t.streak : 1,
    lastTouchedAt: late ? t.lastTouchedAt : new Date(ctx.now.getTime() - dayDiff(ctx.day, day) * DAY_MS),
    touchCount: t.touchCount + 1,
    doneDays: [...(t.doneDays ?? []), day].sort().slice(-400),
  };
}

/**
 * Today taken back from a habit ("Going" after "Done today"): the run goes back to where it
 * was. Null when today wasn't counted.
 */
export function habitUndone(t: Pick<IThread, "streak" | "lastTouchedAt" | "touchCount" | "doneDays">, ctx: Ctx) {
  const days = t.doneDays ?? [];
  const counted = days.includes(ctx.day) || (t.streak > 0 && localDay(ctx.tz, t.lastTouchedAt) === ctx.day);
  if (!counted) return null;
  const left = days.filter((d) => d !== ctx.day);
  // The run today joined ended on its last day done. A run older than the days kept ended within
  // its rest, or today wouldn't have joined it: yesterday keeps it as alive as it was.
  const before = left.at(-1) ?? (t.streak > 1 ? addDays(ctx.day, -1) : undefined);
  return {
    doneDays: left,
    streak: before ? Math.max(0, t.streak - 1) : 0,
    lastTouchedAt: before ? new Date(ctx.now.getTime() - dayDiff(ctx.day, before) * DAY_MS) : t.lastTouchedAt,
    touchCount: Math.max(0, t.touchCount - 1),
  };
}

/**
 * A thread set to a step, wherever it's set: its card, the Threads page, a check-in, the
 * conversation, Maru. One rule, so the same tap does the same thing everywhere. On a habit
 * Done counts today and Going takes it back, and only Paused changes its status; on anything
 * else the step is its status, and Done clears the next step. `note` is where it stands now (what
 * it's stuck on); `said`, the words that go in its log. Null when nothing would change.
 */
export function stepChange(t: IThread, step: ThreadStatus, ctx: Ctx, note = "", said = note): Partial<IThread> | null {
  const set: Partial<IThread> = {};
  if (t.kind === "habit") {
    if (step === "stuck" || step === "waiting") return null;
    const status: ThreadStatus = step === "paused" ? "paused" : "moving";
    if (status !== t.status) {
      set.status = status;
      set.log = withLog(t.log, logItem(said, status, "you", ctx.now));
    }
    if (step === "done") Object.assign(set, habitDone(t, ctx) ?? {});
    if (step === "moving" && t.status !== "paused") Object.assign(set, habitUndone(t, ctx) ?? {});
    if (note) set.lastNote = note;
    return Object.keys(set).length ? set : null;
  }
  const changed = step !== t.status;
  if (!changed && !note) return null;
  if (changed) {
    set.status = step;
    set.lastNote = note;
    if (step === "done") set.nextStep = "";
  } else set.lastNote = note;
  set.log = withLog(t.log, logItem(said, changed ? step : null, "you", ctx.now));
  return { ...set, ...touch(t, ctx) };
}

export function touch(t: Pick<IThread, "touchCount">, ctx: Ctx) {
  return { lastTouchedAt: ctx.now, touchCount: t.touchCount + 1 };
}

const DAYS_KEPT = 60;

/** A thread's fields with these added or changed (by name) and those dropped. Values are kept; at most four. */
export function withFields(fields: IThreadField[], specs: FieldSpec[], drop: string[] = []): IThreadField[] {
  const gone = new Set(drop.map(fieldKey));
  const out = fields.filter((f) => !gone.has(f.key)).map((f) => ({ ...f, days: [...(f.days ?? [])] }));
  for (const s of specs) {
    const key = fieldKey(s.label);
    if (!key || gone.has(key)) continue;
    const f = out.find((x) => x.key === key);
    if (f) {
      f.label = s.label;
      if (s.unit) f.unit = s.unit;
      if (s.goal !== null) f.goal = s.goal;
      if (f.value === null) f.type = s.type;
    } else if (out.length < FIELDS_MAX) {
      out.push({ key, label: s.label, type: s.type, unit: s.unit, goal: s.goal, value: null, at: null, days: [] });
    }
  }
  return out;
}

/**
 * A field with a value for a day. A number is kept per day (the latest day's is its value);
 * words just replace what was there. Null clears that day.
 */
export function withValue(f: IThreadField, value: number | string | null, day: string, now: Date): IThreadField {
  if (f.type === "text") return { ...f, value: value === null ? null : String(value).slice(0, 120), at: value === null ? null : now };
  const days = (f.days ?? []).filter((d) => d.day !== day);
  if (typeof value === "number") days.push({ day, value });
  days.sort((a, b) => (a.day < b.day ? -1 : 1));
  const kept = days.slice(-DAYS_KEPT);
  const last = kept.at(-1);
  return { ...f, days: kept, value: last?.value ?? null, at: last ? (last.day === day ? now : f.at) : null };
}

function toFieldT(f: IThreadField): ThreadT["fields"][number] {
  return {
    key: f.key,
    label: f.label,
    type: f.type,
    unit: f.unit ?? "",
    goal: f.goal ?? null,
    value: f.value ?? null,
    at: f.at ? new Date(f.at).toISOString() : null,
    days: (f.days ?? []).slice(-14).map((d) => ({ day: d.day, value: d.value })),
  };
}

export function toThreadT(t: IThread, ctx: Ctx): ThreadT {
  return {
    _id: String(t._id),
    title: t.title,
    kind: t.kind,
    status: t.status,
    tags: t.tags ?? [],
    nextStep: t.nextStep ?? "",
    lastNote: t.lastNote ?? "",
    dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null,
    lastTouchedAt: new Date(t.lastTouchedAt).toISOString(),
    touchCount: t.touchCount ?? 0,
    streak: liveStreak(t, ctx),
    hue: t.hue ?? 0,
    shared: Boolean(t.shared),
    sharing: (t.with ?? []).length,
    archived: Boolean(t.archived),
    log: (t.log ?? []).map((l) => ({
      at: new Date(l.at).toISOString(),
      text: l.text,
      status: l.status ?? null,
      from: l.from,
    })),
    fields: (t.fields ?? []).map(toFieldT),
  };
}

export function dueIn(t: Pick<IThread, "dueAt">, ctx: Ctx): number | null {
  return t.dueAt ? dayDiff(dateToDay(new Date(t.dueAt)), ctx.day) : null;
}

function displayRank(t: IThread, ctx: Ctx): number {
  if (t.status === "stuck") return 0;
  if (t.status === "waiting") return 1;
  const due = dueIn(t, ctx);
  if (t.status === "moving" && due !== null && due >= 0 && due <= 3) return 2;
  if (t.status === "moving") return 3;
  if (t.status === "done") return 4;
  return 5;
}

/** Active threads by priority (stuck, waiting, due soon, moving), then recently done, then paused. */
export async function listThreads(ctx: Ctx, limit = 24): Promise<ThreadT[]> {
  const since = new Date(ctx.now.getTime() - 14 * DAY_MS);
  const docs = await Thread.find({
    userId: ctx.userId,
    archived: false,
    $or: [{ status: { $ne: "done" } }, { lastTouchedAt: { $gte: since } }],
  })
    .sort({ lastTouchedAt: -1 })
    .limit(200)
    .lean<IThread[]>();
  return docs
    .sort(
      (a, b) =>
        displayRank(a, ctx) - displayRank(b, ctx) ||
        new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime()
    )
    .slice(0, limit)
    .map((t) => toThreadT(t, ctx));
}

/** What's left out of listThreads, newest first, so nothing the writer keeps is out of reach: archived, and done a while ago. */
export async function olderThreads(ctx: Ctx, limit = 100): Promise<ThreadT[]> {
  const since = new Date(ctx.now.getTime() - 14 * DAY_MS);
  const docs = await Thread.find({
    userId: ctx.userId,
    $or: [{ archived: true }, { status: "done", lastTouchedAt: { $lt: since } }],
  })
    .sort({ lastTouchedAt: -1 })
    .limit(limit)
    .lean<IThread[]>();
  return docs.map((t) => toThreadT(t, ctx));
}

export async function knownThreads(userId: string): Promise<KnownThread[]> {
  const docs = await Thread.find({ userId, archived: false })
    .select("title kind")
    .sort({ lastTouchedAt: -1 })
    .limit(200)
    .lean<Pick<IThread, "_id" | "title" | "kind">[]>();
  return docs.map((d) => ({ _id: String(d._id), title: d.title, kind: d.kind }));
}

/** Palette colours go round in order of creation. */
export async function nextHue(userId: string): Promise<number> {
  return (await Thread.countDocuments({ userId })) % 8;
}

export interface NewThread {
  title: string;
  kind: IThread["kind"];
  status?: ThreadStatus;
  tags?: string[];
  nextStep?: string;
  lastNote?: string;
  dueAt?: Date | null;
  shared?: boolean;
  source: IThread["source"];
  /** First log line, in the writer's words. */
  said: string;
  from: IThreadLog["from"];
  /** Habits: done today. */
  didToday?: boolean;
  /** What it keeps a value on. */
  fields?: FieldSpec[];
}

/** Creates a thread, or returns null if one with the same key already exists. */
export async function createThread(ctx: Ctx, input: NewThread, hue: number): Promise<IThread | null> {
  const status = input.status ?? "moving";
  try {
    const doc = await Thread.create({
      userId: ctx.userId,
      title: input.title.slice(0, 60),
      key: threadKey(input.title.slice(0, 60)),
      kind: input.kind,
      status,
      tags: (input.tags ?? []).slice(0, 8),
      nextStep: (input.nextStep ?? "").slice(0, 140),
      lastNote: (input.lastNote ?? "").slice(0, 280),
      dueAt: input.dueAt ?? null,
      lastTouchedAt: ctx.now,
      touchCount: 1,
      streak: input.didToday ? 1 : 0,
      hue,
      shared: Boolean(input.shared),
      source: input.source,
      archived: false,
      log: [logItem(input.said, status, input.from, ctx.now)],
      fields: withFields([], input.fields ?? []),
    });
    return doc.toObject<IThread>();
  } catch (err) {
    if (isDuplicateKey(err)) return null;
    throw err;
  }
}

export async function saveThread(ctx: Ctx, id: Types.ObjectId | string, set: Partial<IThread>): Promise<IThread | null> {
  // A step set anywhere shows on a shared thread, so read where it stood first.
  const stepped = "status" in set || "doneDays" in set;
  const before = stepped ? await Thread.findOne({ _id: id, userId: ctx.userId }).select("userId kind status doneDays with").lean<Stepped>() : null;
  const saved = await Thread.findOneAndUpdate({ _id: id, userId: ctx.userId }, { $set: set }, { returnDocument: "after" }).lean<IThread>();
  if (saved && before?.with?.length) await recordStep(before, saved);
  return saved;
}

/** What a mention in the writer's text changes on a thread Kata already keeps. */
function changesFrom(existing: IThread, c: ThreadCandidate, from: "you" | "page", ctx: Ctx): Partial<IThread> | null {
  const set: Partial<IThread> = {};
  let statusChanged = false;
  if (existing.kind === "habit") {
    if (c.status === "done") Object.assign(set, habitDone(existing, ctx) ?? {});
  } else if (c.status && c.status !== existing.status) {
    set.status = c.status;
    statusChanged = true;
    if (c.status === "done") set.nextStep = "";
    // The old note was about the old state ("stuck on flaky tests").
    if (!c.note) set.lastNote = "";
  }
  // What a stuck or waiting thread is stuck or waiting on is only replaced by a new status statement.
  const holdsState = existing.status === "stuck" || existing.status === "waiting";
  if (c.note && c.note !== existing.lastNote && (c.status || !holdsState)) set.lastNote = c.note.slice(0, 280);
  if (c.nextStep && c.nextStep !== existing.nextStep && set.status !== "done") set.nextStep = c.nextStep.slice(0, 140);
  if (c.dueAt && (!existing.dueAt || new Date(existing.dueAt).getTime() !== c.dueAt.getTime())) set.dueAt = c.dueAt;
  const tags = Array.from(new Set([...(existing.tags ?? []), ...c.tags])).slice(0, 8);
  if (tags.length !== (existing.tags ?? []).length) set.tags = tags;

  const text = (c.snippet || c.note || c.title).slice(0, 500);
  const status = statusChanged ? (set.status ?? null) : null;
  const log = existing.log ?? [];
  if (from === "page") {
    // Autosave sends the page every few seconds: one log line per page per day, rewritten in place.
    let i = -1;
    for (let j = log.length - 1; j >= 0; j--) {
      if (log[j].from === "page" && localDay(ctx.tz, log[j].at) === ctx.day) {
        i = j;
        break;
      }
    }
    if (i >= 0) {
      if (log[i].text !== text || statusChanged) {
        set.log = log.map((l, j) => (j === i ? logItem(text, status ?? l.status, "page", ctx.now) : l));
      }
    } else {
      set.log = withLog(log, logItem(text, status, "page", ctx.now));
      if (existing.kind !== "habit") Object.assign(set, touch(existing, ctx));
    }
  } else {
    set.log = withLog(log, logItem(text, status, from, ctx.now));
    if (existing.kind !== "habit") Object.assign(set, touch(existing, ctx));
  }
  return Object.keys(set).length ? set : null;
}

export interface Applied {
  created: IThread[];
  updated: { before: IThread; after: IThread }[];
  /** Keys of every thread the text was about, changed or not. */
  keys: Set<string>;
}

/** Upserts candidates by key so nothing is tracked twice. */
export async function applyCandidates(
  ctx: Ctx,
  candidates: ThreadCandidate[],
  opts: { from: "you" | "page"; source: "kata" | "page"; onlyCreate?: boolean }
): Promise<Applied> {
  const out: Applied = { created: [], updated: [], keys: new Set() };
  let hue: number | null = null;
  for (const c of candidates) {
    const find = () =>
      c.threadId
        ? Thread.findOne({ _id: c.threadId, userId: ctx.userId }).lean<IThread>()
        : Thread.findOne({ userId: ctx.userId, key: threadKey(c.title) }).lean<IThread>();
    let existing = await find();
    if (!existing && !c.threadId) {
      hue ??= await nextHue(ctx.userId);
      const isHabit = c.kind === "habit";
      const created = await createThread(
        ctx,
        {
          title: c.title,
          kind: c.kind,
          status: isHabit ? "moving" : (c.status ?? "moving"),
          tags: c.tags,
          nextStep: c.nextStep,
          lastNote: c.note,
          dueAt: c.dueAt,
          source: opts.source,
          said: c.snippet || c.title,
          from: opts.from,
          didToday: isHabit && c.status === "done",
        },
        hue
      );
      if (created) {
        out.created.push(created);
        out.keys.add(created.key);
        hue = (hue + 1) % 8;
        continue;
      }
      existing = await find();
    }
    if (!existing) continue;
    out.keys.add(existing.key);
    if (existing.archived || opts.onlyCreate) continue;
    const set = changesFrom(existing, c, opts.from, ctx);
    if (!set) continue;
    const after = await saveThread(ctx, existing._id, set);
    if (after) out.updated.push({ before: existing, after });
  }
  return out;
}

/**
 * Today's page no longer mentions these threads: drop the ones the page itself
 * created today and nothing else has touched (a half-typed phrase caught by
 * autosave), and take today's page line out of the others.
 */
export async function reconcilePage(ctx: Ctx, kept: Set<string>): Promise<void> {
  const recent = await Thread.find({
    userId: ctx.userId,
    archived: false,
    "log.from": "page",
    lastTouchedAt: { $gte: new Date(ctx.now.getTime() - 2 * DAY_MS) },
  }).lean<IThread[]>();
  const drop: Types.ObjectId[] = [];
  for (const t of recent) {
    if (kept.has(t.key)) continue;
    const fromToday = (l: IThreadLog) => l.from === "page" && localDay(ctx.tz, l.at) === ctx.day;
    if (!t.log.some(fromToday)) continue;
    const provisional =
      t.source === "page" &&
      !t.shared &&
      !t.with?.length &&
      t.touchCount <= 1 &&
      t.log.every((l) => l.from === "page") &&
      localDay(ctx.tz, t.createdAt) === ctx.day;
    if (provisional) drop.push(t._id);
    else await Thread.updateOne({ _id: t._id, userId: ctx.userId }, { $set: { log: t.log.filter((l) => !fromToday(l)) } });
  }
  if (drop.length) await Thread.deleteMany({ _id: { $in: drop }, userId: ctx.userId });
}
