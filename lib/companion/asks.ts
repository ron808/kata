import { Types } from "mongoose";
import { Ask, type IAsk } from "@/lib/db/models/Ask";
import type { IQuickReply, IReceipt } from "@/lib/db/models/CompanionMessage";
import { User } from "@/lib/db/models/User";
import { minutesIn, timeIn } from "@/lib/missions/parse";
import type { EngineCtx } from "./engine";
import { insertDrafts, type Draft } from "./messages";
import { capFirst } from "./text";
import { addDays, clockIn, dayDiff, localDay, momentOn, monthDayOf, weekdayOf } from "./time";

/*
 * "Ask me about calling Mum tonight": things the writer asks to be asked about at a time. Kata
 * sends nothing outside the app, so an ask waits for them. It comes up as Maru's message the first
 * time they're in Kata after its time (`deliverAsks`, from the hello or the app's own timer), with
 * taps to settle it: done, in an hour, tomorrow, drop it. When it says it'll come up, it says
 * "when you're in Kata", never that anything will be sent. Times are read in code from how people
 * say them, with the same parser as a list's tasks.
 */

type Ctx = Pick<EngineCtx, "userId" | "day" | "now" | "tz" | "hour">;

/** The most waiting at once. */
export const ASKS_MOST = 20;
/** The most that come up in one go; the rest wait for the next look. */
const AT_ONCE = 3;
/** What a time of day means when only the part of the day is said. */
const PARTS: Record<string, number> = { morning: 9, afternoon: 14, evening: 18, night: 20, tonight: 20 };
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const IN = /\bin\s+((?:an?|one|half\s+an|a\s+couple\s+of|\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|minutes?|mins?)(?:\s+and\s+(?:a\s+half|\d+\s*(?:minutes?|mins?)))?)\b/i;
const TOMORROW = /\btomorrow(?:\s+(morning|afternoon|evening|night))?\b/i;
const TODAY_PART = /\b(?:(tonight)|this\s+(morning|afternoon|evening)|later\s+today|later\s+on|later)\b/i;
const WEEKDAY = /\b(?:on\s+)?(?:this\s+|next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(morning|afternoon|evening|night))?\b/i;
const NEXT_WEEK = /\bnext\s+week\b/i;
const ON_DAY = /\b(?:on\s+)?(\d{4}-\d{2}-\d{2})\b/;

/** Minutes after a day's midnight as a moment on that day. */
const momentAt = (day: string, hour: number, minute = 0, tz: string) => momentOn(day, hour, minute, tz);

/**
 * When something said should come up, and the words without it: "tonight" is eight (or half an
 * hour from now if that's gone), "tomorrow" nine, "on Friday at 6pm" just that, "in 2 hours"
 * from now. A time that's already gone by today means half an hour from now. Null when it
 * doesn't say.
 */
export function askWhen(said: string, ctx: Ctx): { at: Date | null; rest: string } {
  let rest = ` ${said} `;
  const soon = new Date(ctx.now.getTime() + 30 * 60_000);
  const later = (at: Date) => (at.getTime() > ctx.now.getTime() + 5 * 60_000 ? at : soon);

  const inside = rest.match(IN);
  if (inside) {
    const { minutes } = minutesIn(inside[1].replace(/^half\s+an\s+hour/i, "30 minutes").replace(/^an?\s+hour\s+and\s+a\s+half/i, "90 minutes"));
    if (minutes) return { at: new Date(ctx.now.getTime() + minutes * 60_000), rest: rest.replace(IN, " ") };
  }

  let day: string | null = null;
  let part: string | null = null;
  let m: RegExpMatchArray | null;
  if ((m = rest.match(TOMORROW))) {
    day = addDays(ctx.day, 1);
    part = m[1]?.toLowerCase() ?? null;
    rest = rest.replace(TOMORROW, " ");
  } else if ((m = rest.match(ON_DAY))) {
    day = m[1];
    rest = rest.replace(ON_DAY, " ");
  } else if ((m = rest.match(WEEKDAY))) {
    const want = WEEKDAYS.indexOf(m[1].toLowerCase());
    const now = WEEKDAYS.indexOf(weekdayOf(ctx.day).toLowerCase());
    // The coming one: said on a Friday, "Friday" is a week away.
    day = addDays(ctx.day, (want - now + 7) % 7 || 7);
    part = m[2]?.toLowerCase() ?? null;
    rest = rest.replace(WEEKDAY, " ");
  } else if (NEXT_WEEK.test(rest)) {
    day = addDays(ctx.day, 7 - WEEKDAYS.indexOf(weekdayOf(ctx.day).toLowerCase()));
    rest = rest.replace(NEXT_WEEK, " ");
  } else if ((m = rest.match(TODAY_PART))) {
    rest = rest.replace(TODAY_PART, " ");
    const named = (m[1] ?? m[2])?.toLowerCase();
    if (!named) {
      // "Later": a few hours on, or the next morning when that would be the middle of the night.
      const at = new Date(ctx.now.getTime() + 3 * 3_600_000);
      const [hour] = clockIn(ctx.tz, at);
      return { at: hour >= 22 || hour < 8 ? momentAt(addDays(ctx.day, 1), 9, 0, ctx.tz) : at, rest };
    }
    // Still up before the day turns at four, "tonight" is the evening ahead, not an hour from now.
    day = ctx.hour < 4 ? addDays(ctx.day, 1) : ctx.day;
    part = named;
  }

  // A clock time, on the day said or the next one it can mean.
  const clock = timeIn(rest, { day: day ?? ctx.day, now: ctx.now, tz: ctx.tz });
  if (clock.at) return { at: day ? clock.at : later(clock.at), rest: clock.rest };
  if (!day) return { at: null, rest };
  const hour = part ? PARTS[part] : 9;
  // Past midnight belongs to the next date: the day turns at four.
  const at = momentAt(day, hour, 0, ctx.tz);
  return { at: at.getTime() <= ctx.now.getTime() + 5 * 60_000 ? soon : at, rest };
}

// "Remind me to call Mum tonight", "ask me about the dentist on Friday", "check in with me tomorrow about the deck".
const ASK_LEAD =
  /^(?:(?:hey|ok(?:ay)?|so)[,\s]+)?(?:(?:can|could|will|would)\s+you\s+(?:please\s+)?|please\s+)?(?:remind\s+me|ask\s+me|check\s+in\s+with\s+me|check\s+in|bring\s+(?:it\s+|this\s+|that\s+)?up|nudge\s+me)(?=[\s,.?!]|$)/i;

/** What's left of the words once the time is out: "to call Mum" is "call Mum". */
function whatOf(words: string): string {
  return words
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:–—-]+|[\s,.;:?!–—-]+$/g, "")
    .replace(/^(?:to|about|that|if|whether|on|of|again)\s+/i, "")
    .replace(/\s+(?:please|thanks|thank you|pls)$/i, "")
    .replace(/\s+(?:at|on|by|around)$/i, "")
    .trim()
    .slice(0, 120);
}

/** Whether the words start by asking to be asked about something later, before any time is read. */
export const asksLater = (said: string) => ASK_LEAD.test(said.trim());

/** "Remind me to call Mum tonight" as what and when; null when it isn't asking to be asked about something. */
export function askAsked(said: string, ctx: Ctx): { what: string; at: Date | null } | null {
  const lead = said.trim().match(ASK_LEAD);
  if (!lead) return null;
  const { at, rest } = askWhen(said.trim().slice(lead[0].length), ctx);
  return { what: whatOf(rest), at };
}

/** When it'll come up, said plainly: "Today after 6 pm", "Tomorrow after 9 am", "Friday after 9 am". */
export function whenSaid(at: Date, ctx: Pick<Ctx, "day" | "tz">): string {
  const [hour, minute] = clockIn(ctx.tz, at);
  const clock = `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
  const day = localDay(ctx.tz, at);
  const ahead = dayDiff(day, ctx.day);
  const on = ahead <= 0 ? "Today" : ahead === 1 ? "Tomorrow" : ahead < 7 ? weekdayOf(day) : monthDayOf(day);
  return `${on} after ${clock}`;
}

/** Keeps the earliest waiting ask on the user, so the app knows when to look. */
export async function syncNextAsk(userId: string): Promise<Date | null> {
  const next = await Ask.findOne({ userId: new Types.ObjectId(userId), status: "waiting" }).sort({ at: 1 }).select("at").lean<Pick<IAsk, "at">>();
  const at = next?.at ?? null;
  await User.updateOne({ _id: userId }, { $set: { nextAskAt: at } });
  return at;
}

export class TooManyAsks extends Error {}

/** Keeps something to ask about. */
export async function askLater(ctx: Ctx, what: string, at: Date): Promise<{ ask: IAsk; next: Date | null }> {
  const uid = new Types.ObjectId(ctx.userId);
  if ((await Ask.countDocuments({ userId: uid, status: "waiting" })) >= ASKS_MOST) throw new TooManyAsks(`There are ${ASKS_MOST} things waiting to be asked about already.`);
  const ask = (await Ask.create({ userId: uid, text: whatOf(what), at })).toObject() as IAsk;
  return { ask, next: await syncNextAsk(ctx.userId) };
}

/** What a receipt says about something kept to ask about. */
export const askReceipt = (ask: Pick<IAsk, "text" | "at">, ctx: Pick<Ctx, "day" | "tz">, again = false): IReceipt => ({
  kind: "ask",
  text: `${again ? "Will ask again" : "Will ask"}: ${capFirst(ask.text)}`.slice(0, 80),
  detail: `${whenSaid(ask.at, ctx)}, when you’re in Kata`,
  href: null,
  hue: null,
});

const replies = (id: string): IQuickReply[] => [
  { label: "Done", value: `ask:done:${id}` },
  { label: "In an hour", value: `ask:hour:${id}` },
  { label: "Tomorrow", value: `ask:tomorrow:${id}` },
  { label: "Drop it", value: `ask:drop:${id}` },
];

/** "Now", "at 6 pm", "yesterday": when they asked for it to come up, from now. */
function askedFor(at: Date, ctx: Ctx): string {
  if (ctx.now.getTime() - at.getTime() < 90 * 60_000) return "now";
  const ago = dayDiff(ctx.day, localDay(ctx.tz, at));
  if (ago <= 0) return `at ${whenSaid(at, ctx).replace(/^Today after /, "")}`;
  return ago === 1 ? "yesterday" : `on ${weekdayOf(localDay(ctx.tz, at))}`;
}

/**
 * Brings up what's due, as Maru's messages in today's conversation, at most three at once. Each
 * ask is claimed before it's written, so the hello and the app's timer can't both bring it up.
 */
export async function deliverAsks(ctx: Ctx): Promise<{ drafts: Draft[]; ids: Types.ObjectId[] }> {
  const uid = new Types.ObjectId(ctx.userId);
  const due: IAsk[] = [];
  for (let i = 0; i < AT_ONCE; i++) {
    const ask = await Ask.findOneAndUpdate({ userId: uid, status: "waiting", at: { $lte: ctx.now } }, { $set: { status: "asked", askedAt: ctx.now } }, { sort: { at: 1 }, returnDocument: "after" }).lean<IAsk>();
    if (!ask) break;
    due.push(ask);
  }
  const drafts = due.map((ask): Draft => ({ from: "kata", kind: "question", text: `You asked me to bring this up ${askedFor(ask.at, ctx)}: ${ask.text}.`, replies: replies(String(ask._id)) }));
  return { drafts, ids: due.map((a) => a._id) };
}

/** Writes what's due into today's conversation, and keeps the next time. */
export async function bringUpAsks(ctx: Ctx) {
  const { drafts, ids } = await deliverAsks(ctx);
  if (!drafts.length) return { created: [], next: await syncNextAsk(ctx.userId) };
  const created = await insertDrafts(ctx.userId, ctx.day, drafts);
  await Promise.all(ids.map((id, i) => Ask.updateOne({ _id: id }, { $set: { messageId: created[i]._id } })));
  return { created, next: await syncNextAsk(ctx.userId) };
}

/**
 * A tap on an ask that came up: done, an hour on, the same time tomorrow, or dropped. Their side
 * says which ("Call Mum: Done") and Maru's is a receipt for what changed, with no line of its own.
 */
export async function answerAsk(ctx: Ctx, value: string, label: string): Promise<{ you: string; kata: Draft; next: Date | null }> {
  const [, act, id] = value.split(":");
  const ask = Types.ObjectId.isValid(id) ? await Ask.findOne({ _id: id, userId: new Types.ObjectId(ctx.userId) }).lean<IAsk>() : null;
  if (!ask) return { you: label, kata: { from: "kata", kind: "reply", text: "That one’s gone." }, next: null };
  const what = capFirst(ask.text);
  let receipt: IReceipt;
  if (act === "hour" || act === "tomorrow") {
    const [hour, minute] = clockIn(ctx.tz, ask.at);
    const at = act === "hour" ? new Date(ctx.now.getTime() + 3_600_000) : momentOn(addDays(ctx.day, 1), hour, minute, ctx.tz);
    await Ask.updateOne({ _id: ask._id }, { $set: { status: "waiting", at, askedAt: null } });
    receipt = askReceipt({ text: ask.text, at }, ctx, true);
  } else {
    await Ask.updateOne({ _id: ask._id }, { $set: { status: act === "done" ? "done" : "dropped" } });
    receipt = { kind: "ask", text: `${act === "done" ? `${what}: done` : `Dropped: ${what}`}`.slice(0, 80), detail: "", href: null, hue: null };
  }
  return { you: `${what}: ${label}`, kata: { from: "kata", kind: "reply", text: "", done: [receipt] }, next: await syncNextAsk(ctx.userId) };
}

/** What's waiting, soonest first, for Settings. */
export async function waitingAsks(userId: string): Promise<{ _id: string; text: string; at: string }[]> {
  const asks = await Ask.find({ userId: new Types.ObjectId(userId), status: "waiting" }).sort({ at: 1 }).limit(ASKS_MOST).lean<IAsk[]>();
  return asks.map((a) => ({ _id: String(a._id), text: a.text, at: new Date(a.at).toISOString() }));
}

/** Drops one before it comes up; says whether it was waiting, and when the next one is. */
export async function dropAsk(userId: string, id: string): Promise<{ dropped: boolean; next: Date | null }> {
  if (!Types.ObjectId.isValid(id)) return { dropped: false, next: null };
  const res = await Ask.updateOne({ _id: id, userId: new Types.ObjectId(userId), status: "waiting" }, { $set: { status: "dropped" } });
  return { dropped: res.modifiedCount > 0, next: await syncNextAsk(userId) };
}
