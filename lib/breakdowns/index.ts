import mongoose from "mongoose";
import { WRITING_MODELS, complete, isGroqConfigured } from "@/lib/ai/groq";
import { Breakdown, type BreakdownKind, type IBreakdown } from "@/lib/db/models/Breakdown";
import type { IReceipt } from "@/lib/db/models/CompanionMessage";
import type { EngineCtx } from "@/lib/companion/engine";
import { addDays, dayDiff, localDay } from "@/lib/companion/time";
import type { BreakdownT } from "@/lib/types";
import { addMonths, periodTitle, rangeText, weekStart, type Period } from "./period";
import { emptyStats, gather, scoreOf } from "./stats";
import { percent, plural, scoreText, summaryLine, verdictOf } from "./summary";

/*
 * Breakdowns: how a stretch of time went, worked out in code (stats.ts) and kept. Weekly ones
 * are made the first time the writer turns up after a week ends; asked ones come from Maru or
 * the Breakdowns page and go after thirty days unless kept. Maru writes a few sentences on
 * each, once, the first time it's opened.
 */

const KEEP_DAYS = 30;
const DAY_MS = 86_400_000;

type Ctx = Pick<EngineCtx, "userId" | "tz" | "day" | "now" | "user">;

/** The day they joined: nothing before it is counted. */
const joinDay = (ctx: Ctx) => (ctx.user.createdAt ? localDay(ctx.tz, new Date(ctx.user.createdAt)) : addDays(ctx.day, -364));

const later = (a: string, b: string) => (a > b ? a : b);
const sooner = (a: string, b: string) => (a < b ? a : b);

export function toBreakdownT(b: IBreakdown): BreakdownT {
  return {
    _id: String(b._id),
    kind: b.kind,
    from: b.from,
    to: b.to,
    unit: b.unit,
    counted: b.counted,
    upTo: b.upTo,
    score: b.score ?? null,
    parts: { showingUp: b.parts?.showingUp ?? null, progress: b.parts?.progress ?? null, habits: b.parts?.habits ?? null },
    stats: { ...emptyStats(), ...b.stats },
    previous: b.previous ?? null,
    take: b.take ?? "",
    expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
    madeAt: new Date(b.madeAt).toISOString(),
  };
}

/** The same point in the stretch before: last Monday to Wednesday against this Monday to Wednesday. */
async function previousOf(ctx: Ctx, p: Period, upTo: string, joined: string): Promise<IBreakdown["previous"]> {
  const from =
    p.unit === "week" ? addDays(p.from, -7) : p.unit === "month" ? addMonths(p.from, -1) : p.unit === "year" ? addMonths(p.from, -12) : addDays(p.from, -(dayDiff(p.to, p.from) + 1));
  const prevUpTo = sooner(addDays(from, dayDiff(upTo, p.from)), addDays(p.from, -1));
  const counted = later(from, joined);
  if (counted > prevUpTo) return null;
  const { score } = scoreOf(await gather(ctx.userId, ctx.tz, counted, prevUpTo, ctx.day));
  return { from, upTo: prevUpTo, score };
}

/** Works out a stretch and keeps it. Asking for the same stretch again brings it up to date. */
export async function makeBreakdown(ctx: Ctx, p: Period, kind: BreakdownKind): Promise<IBreakdown> {
  const joined = joinDay(ctx);
  const upTo = sooner(p.to, ctx.day);
  // A stretch from before they joined stays that stretch, with nothing in it.
  const counted = joined > upTo ? p.from : later(p.from, joined);
  const [stats, previous, existing] = await Promise.all([
    gather(ctx.userId, ctx.tz, counted, upTo, ctx.day),
    previousOf(ctx, p, upTo, joined),
    Breakdown.findOne({ userId: ctx.userId, kind, from: p.from, to: p.to }).select("expiresAt").lean<Pick<IBreakdown, "expiresAt">>(),
  ]);
  const { score, parts } = scoreOf(stats);
  // Kept stays kept.
  const expiresAt = kind === "weekly" || (existing && existing.expiresAt === null) ? null : new Date(ctx.now.getTime() + KEEP_DAYS * DAY_MS);
  const doc = await Breakdown.findOneAndUpdate(
    { userId: ctx.userId, kind, from: p.from, to: p.to },
    {
      $set: {
        unit: p.unit,
        counted,
        upTo,
        stats,
        score,
        parts,
        previous,
        take: "",
        takeAt: null,
        empty: !stats.active.length && !stats.done.length,
        madeAt: ctx.now,
        expiresAt,
      },
    },
    { upsert: true, returnDocument: "after" }
  ).lean<IBreakdown>();
  if (!doc) throw new Error("breakdown not saved");
  return doc;
}

/** A stretch they asked for. A finished week that has its weekly breakdown brings that one up to date instead of making another. */
export async function askBreakdown(ctx: Ctx, p: Period): Promise<IBreakdown> {
  const weekly = p.unit === "week" && p.to < ctx.day && (await Breakdown.exists({ userId: ctx.userId, kind: "weekly", from: p.from, to: p.to }));
  return makeBreakdown(ctx, p, weekly ? "weekly" : "asked");
}

/**
 * Last week's breakdown, made the first time it's looked for after the week ends. Null when
 * it was already made, they joined after it, or nothing happened in it.
 */
export async function ensureWeekly(ctx: Ctx): Promise<IBreakdown | null> {
  const from = addDays(weekStart(ctx.day), -7);
  const to = addDays(from, 6);
  // A score needs a week to score: joining on a Sunday night isn't one.
  if (dayDiff(to, joinDay(ctx)) < 2) return null;
  if (await Breakdown.exists({ userId: ctx.userId, kind: "weekly", from, to })) return null;
  try {
    const made = await makeBreakdown(ctx, { from, to, unit: "week" }, "weekly");
    return made.empty ? null : made;
  } catch (err) {
    // Two requests made it at once: the other one has it.
    if ((err as { code?: number })?.code === 11000) return null;
    throw err;
  }
}

export async function listBreakdowns(userId: string, limit = 30): Promise<BreakdownT[]> {
  const docs = await Breakdown.find({ userId, empty: { $ne: true } }).sort({ madeAt: -1 }).limit(limit).lean<IBreakdown[]>();
  return docs.map(toBreakdownT);
}

export async function getBreakdown(userId: string, id: string): Promise<BreakdownT | null> {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  const doc = await Breakdown.findOne({ _id: id, userId }).lean<IBreakdown>();
  return doc ? toBreakdownT(doc) : null;
}

/** Keeps an asked breakdown (or lets it go in thirty days). Weekly ones are always kept. */
export async function keepBreakdown(ctx: Ctx, id: string, keep: boolean): Promise<BreakdownT | null> {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  const doc = await Breakdown.findOneAndUpdate(
    { _id: id, userId: ctx.userId, kind: "asked" },
    { $set: { expiresAt: keep ? null : new Date(ctx.now.getTime() + KEEP_DAYS * DAY_MS) } },
    { returnDocument: "after" }
  ).lean<IBreakdown>();
  return doc ? toBreakdownT(doc) : null;
}

export async function deleteBreakdown(userId: string, id: string): Promise<boolean> {
  if (!mongoose.isObjectIdOrHexString(id)) return false;
  const res = await Breakdown.deleteOne({ _id: id, userId, kind: "asked" });
  return res.deletedCount > 0;
}

/** What a receipt says about a breakdown that was just made. */
export function breakdownReceipt(t: BreakdownT, today: string): IReceipt {
  return {
    kind: "breakdown",
    text: `${periodTitle(t, t.upTo, today)}: ${scoreText(t.score)}`.slice(0, 80),
    detail: `${rangeText(t.counted, t.upTo, today)} · ${summaryLine(t.stats, t.parts)}`,
    href: `/breakdowns/${t._id}`,
    hue: null,
  };
}

// ── Maru's take ───────────────────────────────────────────────────────────────

// The same for every breakdown of this writer's, so the provider can cache it.
function takePrompt(name: string, first: string) {
  const them = first || "the writer";
  return `You are ${name}, the companion in ${them}'s journal app, Kata. You get the facts of a breakdown: how a stretch of their time went, worked out from what they logged. Write ${them} a short take on it: two or three sentences, under 60 words. Say what went well, name what's stuck or slipping if anything is, and end with one small next step from their own threads. Use only the facts given, and their words for things. Plain, warm and direct: no greeting, no sign-off, no lists, no emoji, no exclamation marks, and no scores or percentages.`;
}

const MOOD_WORDS = ["foggy", "low", "okay", "good", "bright"];

/** The breakdown as lines of facts for the model. */
export function factsOf(b: BreakdownT, today: string): string {
  const s = b.stats;
  const titles = (items: { title: string }[]) => items.map((t) => t.title).join(", ");
  const parts = [
    b.parts.showingUp !== null ? `showed up on ${s.active.length} of ${s.days} days` : "",
    b.parts.progress !== null ? `${s.done.length} done and ${s.moved.length} moving of ${s.open} open threads` : "",
    b.parts.habits !== null ? `habits kept on ${percent(b.parts.habits)} of days` : "",
  ].filter(Boolean);
  return [
    `Stretch: ${periodTitle(b, b.upTo, today)} (${rangeText(b.counted, b.upTo, today)}), ${plural(s.days, "day")} counted.`,
    // Words, not the number: given the number, models repeat it.
    `How it went: ${verdictOf(b.score).toLowerCase()}${parts.length ? ` (${parts.join("; ")})` : ""}.`,
    b.previous?.score && b.score ? `Against the same point in the stretch before: ${b.score > b.previous.score ? "better" : b.score < b.previous.score ? "not as good" : "about the same"}.` : "",
    s.done.length ? `Done: ${titles(s.done)}.` : "",
    s.moved.length ? `Moving: ${s.moved.map((t) => `${t.title} (${plural(t.updates, "update")})`).join(", ")}.` : "",
    s.stuck.length ? `Stuck: ${titles(s.stuck)}.` : "",
    s.started.length ? `Started: ${titles(s.started)}.` : "",
    s.habits.length ? `Habits: ${s.habits.map((h) => `${h.title} on ${h.days.length} of ${h.of} days`).join("; ")}.` : "",
    s.numbers.length
      ? `Numbers: ${s.numbers.map((n) => `${n.thread.title}, ${n.label}: ${n.total}${n.unit ? ` ${n.unit}` : ""} over ${plural(n.days, "day")}${n.goal ? ` (goal ${n.goal}, reached on ${n.hit})` : ""}`).join("; ")}.`
      : "",
    s.pages.days.length ? `Pages: written on ${s.pages.days.length} of ${s.days} days, ${plural(s.pages.words, "word")}.` : "Pages: none written.",
    s.moods.length ? `Moods: ${s.moods.map((m) => MOOD_WORDS[m.mood - 1] ?? "okay").join(", ")}.` : "",
    s.people.moments || s.people.replies ? `People: shared ${plural(s.people.moments, "moment")}, wrote ${plural(s.people.replies, "reply", "replies")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function cleanTake(text: string | null | undefined, name: string): string {
  return (text ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(new RegExp(`^\\s*(?:${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|maru|kata):\\s*`, "i"), "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
}

/** Maru's take on a breakdown, written once. Empty when no model can write it now. */
export async function writeTake(ctx: Pick<EngineCtx, "userId" | "day" | "now" | "companion" | "first">, id: string): Promise<string | null> {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  const doc = await Breakdown.findOne({ _id: id, userId: ctx.userId }).lean<IBreakdown>();
  if (!doc) return null;
  if (doc.take) return doc.take;
  if (!isGroqConfigured() || doc.empty) return "";
  const res = await complete(
    {
      messages: [
        { role: "system", content: takePrompt(ctx.companion, ctx.first) },
        { role: "user", content: factsOf(toBreakdownT(doc), ctx.day) },
      ],
      temperature: 0.5,
      max_tokens: 700,
    },
    { models: WRITING_MODELS, timeout: 20_000 }
  );
  const take = cleanTake(res.choices[0]?.message?.content, ctx.companion);
  if (take) await Breakdown.updateOne({ _id: doc._id, take: "" }, { $set: { take, takeAt: ctx.now } });
  return take;
}
