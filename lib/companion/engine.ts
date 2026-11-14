import mongoose from "mongoose";
import { breakdownReceipt, ensureWeekly, toBreakdownT } from "@/lib/breakdowns";
import { connectDB } from "@/lib/db/mongoose";
import { CompanionMessage, type IChoice, type ICompanionMessage, type IQuickReply, type IReceipt } from "@/lib/db/models/CompanionMessage";
import { Entry, type IEntry } from "@/lib/db/models/Entry";
import { THREAD_STATUSES, Thread, type IThread, type ThreadStatus } from "@/lib/db/models/Thread";
import { User, type IUser } from "@/lib/db/models/User";
import { shareMoment } from "@/lib/social/actions";
import { NEEDS_PROFILE } from "@/lib/social/handles";
import { hourIn } from "@/lib/utils/dates";
import { streakFromDates } from "@/lib/utils/streaks";
import { interestTags, roleKeyOf } from "@/lib/questions/daily";
import {
  LAST_STEP,
  SHARE_REPLIES,
  STEP_DONE,
  checkinLine,
  chooseCheckins,
  eveningLine,
  threadFact,
  type History,
  type Line,
  type Planned,
} from "./checkins";
import {
  ack,
  contextLine,
  followUp,
  isEvening,
  moodQuestion,
  moodReply,
  openQuestion,
  salutation,
  type GreetingFacts,
} from "./copy";
import { CompanionError } from "./errors";
import { habitRun } from "./fields";
import { input, logChoice } from "./forms";
import { companionNameOf, nicknameOf } from "./name";
import { candidatesFromItems, splitList, statusIn, threadsFromText, threadsMentioned } from "./extract";
import { insertDrafts, isDuplicateKey, messagesForDay, MOOD_REPLIES, stableId, type Draft } from "./messages";
import { isShortPhrase, joinList, noteText, ref, seedOf, stepText, trimEnd } from "./text";
import {
  applyCandidates,
  dueIn,
  habitDone,
  knownThreads,
  liveStreak,
  logItem,
  saveThread,
  stepChange,
  touch,
  withLog,
  type Applied,
  type Ctx,
} from "./threads";
import { stepSaid, stepsFor } from "./steps";
import { addDays, dateToDay, dayToDate, localDay, validTimeZone, weekdayOf } from "./time";
import { voiceCheckin } from "./voice";

/**
 * Kata's side of the conversation. ensureToday writes the day's opening (and
 * later the evening set) once; answer and say handle the writer's replies and
 * keep the threads up to date.
 */

export interface EngineCtx extends Ctx {
  user: IUser;
  hour: number;
  /** What the companion calls the writer: their nickname, else their first name. */
  first: string;
  /** What the writer calls the companion. */
  companion: string;
}

export async function contextFor(userId: string): Promise<EngineCtx> {
  await connectDB();
  const doc = await User.findById(userId).lean<IUser>();
  if (!doc) throw new CompanionError("Not found", 404);
  // Accounts from before the companion have none of its fields.
  const user: IUser = { ...doc, interests: doc.interests ?? [], checkIn: doc.checkIn ?? "morning", onboardedAt: doc.onboardedAt ?? null };
  const tz = validTimeZone(user.timezone);
  const now = new Date();
  return {
    userId,
    tz,
    now,
    day: localDay(tz, now),
    hour: hourIn(tz, now),
    user,
    first: nicknameOf(user),
    companion: companionNameOf(user),
  };
}

const seedFor = (ctx: Ctx, ...parts: string[]) => seedOf(ctx.userId, ctx.day, ...parts);

function onboardedToday(ctx: EngineCtx): boolean {
  return Boolean(ctx.user.onboardedAt && localDay(ctx.tz, new Date(ctx.user.onboardedAt)) === ctx.day);
}

export async function activeThreads(ctx: Ctx): Promise<IThread[]> {
  return Thread.find({ userId: ctx.userId, archived: false, status: { $nin: ["done", "paused"] } })
    .sort({ lastTouchedAt: -1 })
    .limit(200)
    .lean<IThread[]>();
}

export async function historyFor(ctx: Ctx): Promise<History> {
  const [yesterday, asked] = await Promise.all([
    CompanionMessage.find({ userId: ctx.userId, from: "kata", kind: "checkin", day: addDays(ctx.day, -1) })
      .sort({ createdAt: 1 })
      .select("threadId answer")
      .lean<Pick<ICompanionMessage, "threadId" | "answer">[]>(),
    CompanionMessage.distinct("threadId", { userId: ctx.userId, from: "kata", kind: "checkin" }),
  ]);
  // Oldest first, so the latest answer about a thread wins ("I'll ask again tomorrow", then "ask me later").
  const answers = new Map<string, string | null>();
  for (const m of yesterday) {
    if (!m.threadId) continue;
    const id = String(m.threadId);
    answers.set(id, m.answer ?? answers.get(id) ?? null);
  }
  return { yesterday: answers, asked: new Set(asked.filter(Boolean).map(String)) };
}

async function greetingFacts(ctx: EngineCtx): Promise<GreetingFacts> {
  const yesterday = addDays(ctx.day, -1);
  const [entries, recent] = await Promise.all([
    Entry.find({ userId: ctx.userId })
      .sort({ date: -1 })
      .limit(400)
      .select("date createdAt wordCount")
      .lean<Pick<IEntry, "date" | "createdAt" | "wordCount">[]>(),
    Thread.find({
      userId: ctx.userId,
      archived: false,
      "log.from": "page",
      updatedAt: { $gte: new Date(ctx.now.getTime() - 3 * 86_400_000) },
    }).lean<IThread[]>(),
  ]);
  // By the day a page is about, not when it was typed: yesterday's page is often written this morning.
  const wroteYesterday = entries.find((e) => dateToDay(new Date(e.date)) === yesterday);
  const topics = recent
    .filter((t) => t.log.some((l) => l.from === "page" && localDay(ctx.tz, new Date(l.at)) === yesterday))
    .map(ref);
  return {
    streak: streakFromDates(entries.map((e) => new Date(e.date)), dayToDate(ctx.day)),
    wroteToday: Boolean(entries[0] && dateToDay(new Date(entries[0].date)) === ctx.day),
    yesterdayTopics: wroteYesterday ? topics : [],
    yesterdayWords: wroteYesterday?.wordCount || null,
    lastPageDay: entries[0] ? dateToDay(new Date(entries[0].date)) : null,
    pages: entries.length,
  };
}

async function checkinDraft(line: Line, thread: IThread, ctx: Ctx): Promise<Draft> {
  // A thread that keeps numbers can be logged right from its check-in, with no model. A habit's
  // answer is Done, and the numbers come after it: one question, one control.
  const log = thread.kind === "habit" ? null : logChoice(thread);
  return {
    from: "kata",
    kind: "checkin",
    text: await voiceCheckin(line.text, thread, liveStreak(thread, ctx)),
    threadId: thread._id,
    replies: line.replies,
    choices: log ? [log] : [],
  };
}

function plannedDrafts(planned: Planned[], ctx: EngineCtx): Promise<Draft[]> {
  return Promise.all(planned.map((p) => checkinDraft(checkinLine(p, ctx, seedFor(ctx, String(p.thread._id)), isEvening(ctx.hour)), p.thread, ctx)));
}

/** Writes a set of messages; if another request already wrote it (same stable _id), writes nothing. */
async function insertOnce(ctx: Ctx, drafts: Draft[]): Promise<ICompanionMessage[]> {
  try {
    return await insertDrafts(ctx.userId, ctx.day, drafts);
  } catch (err) {
    if (isDuplicateKey(err)) return [];
    throw err;
  }
}

/** The first visit of the writer's day: a greeting, a mood check, and one or two check-ins. */
async function openDay(ctx: EngineCtx): Promise<ICompanionMessage[]> {
  const [threads, history, facts, week] = await Promise.all([
    activeThreads(ctx),
    historyFor(ctx),
    greetingFacts(ctx),
    // Last week's breakdown, made the first time they turn up after the week ends.
    ensureWeekly(ctx).catch((err) => {
      console.error("breakdowns:weekly", err);
      return null;
    }),
  ]);
  const drafts: Draft[] = [
    {
      _id: stableId(ctx.userId, ctx.day, "opening"),
      from: "kata",
      kind: "greeting",
      text: `${salutation(ctx.hour, ctx.first, seedFor(ctx, "hello"))} ${contextLine(facts, ctx.day, seedFor(ctx, "context"))}`,
      ...(week ? { done: [breakdownReceipt(toBreakdownT(week), ctx.day)] } : {}),
    },
    { from: "kata", kind: "mood", text: moodQuestion(ctx.hour, seedFor(ctx, "mood")), replies: MOOD_REPLIES },
  ];
  if (!threads.length) {
    drafts.push({
      from: "kata",
      kind: "question",
      text: openQuestion(roleKeyOf(ctx.user.role), interestTags(ctx.user.interests), seedFor(ctx, "open")),
    });
  } else if (!onboardedToday(ctx) && (ctx.user.checkIn !== "evening" || isEvening(ctx.hour))) {
    drafts.push(...(await plannedDrafts(chooseCheckins(threads, ctx, history), ctx)));
  }
  return insertOnce(ctx, drafts);
}

function eveningDue(ctx: EngineCtx, messages: ICompanionMessage[], greeting: ICompanionMessage): boolean {
  return (
    (ctx.user.checkIn === "evening" || ctx.user.checkIn === "both") &&
    isEvening(ctx.hour) &&
    !isEvening(hourIn(ctx.tz, new Date(greeting.createdAt))) &&
    // Not a second hello minutes after the first.
    ctx.now.getTime() - new Date(greeting.createdAt).getTime() >= 3 * 3_600_000 &&
    !messages.some((m) => m.from === "kata" && m.kind === "nudge")
  );
}

/** After 17:00 for evening check-ins: how did today go, and one follow-up on what came up this morning. */
async function openEvening(ctx: EngineCtx, messages: ICompanionMessage[]): Promise<ICompanionMessage[]> {
  const drafts: Draft[] = [
    {
      _id: stableId(ctx.userId, ctx.day, "evening"),
      from: "kata",
      kind: "nudge",
      text: `${salutation(ctx.hour, ctx.first, seedFor(ctx, "evening-hello"))} ${moodQuestion(ctx.hour, seedFor(ctx, "evening-mood"))}`,
      replies: MOOD_REPLIES,
    },
  ];
  if (!onboardedToday(ctx)) drafts.push(...(await eveningCheckins(ctx, messages)));
  return insertOnce(ctx, drafts);
}

async function eveningCheckins(ctx: EngineCtx, messages: ICompanionMessage[]): Promise<Draft[]> {
  const threads = await activeThreads(ctx);
  const byId = new Map(threads.map((t) => [String(t._id), t]));
  // Not what they've just answered: a habit done today, or something they said to leave for another day.
  const open = (m: ICompanionMessage) => {
    const t = byId.get(String(m.threadId));
    if (!t) return false;
    // "said": they told the model about it in their own words, which settles it for the evening too.
    return t.kind === "habit" ? !(t.streak > 0 && localDay(ctx.tz, t.lastTouchedAt) === ctx.day) : m.answer !== "later" && m.answer !== "said";
  };
  const morning = messages.filter((m) => m.from === "kata" && m.kind === "checkin" && m.threadId && open(m));
  const seed = seedFor(ctx, "evening-checkin");
  if (morning.length) {
    const order = (m: ICompanionMessage) => (m.answer === "stuck" || m.answer === "waiting" ? 0 : m.answer === null ? 1 : 2);
    const m = [...morning].sort((a, b) => order(a) - order(b))[0];
    const t = byId.get(String(m.threadId)) as IThread;
    return [await checkinDraft(eveningLine(t, m.answer, ctx, seed), t, ctx)];
  }
  // No check-ins this morning: evening people get theirs now, or Kata follows up on what came up today.
  const planned = chooseCheckins(threads, ctx, await historyFor(ctx));
  if (planned.length) return plannedDrafts(planned, ctx);
  const cameUp = threads.find((t) => t.kind !== "habit" && localDay(ctx.tz, new Date(t.updatedAt)) === ctx.day);
  return cameUp ? [await checkinDraft(eveningLine(cameUp, undefined, ctx, seed), cameUp, ctx)] : [];
}

export interface Today {
  ctx: EngineCtx;
  /** Today's conversation, oldest first. */
  messages: ICompanionMessage[];
  /** What this call added. */
  created: ICompanionMessage[];
}

/** On the first call of the writer's local day, writes Kata's messages for the day. Returns the day's conversation. */
export async function ensureToday(userId: string): Promise<Today> {
  const ctx = await contextFor(userId);
  let messages = await messagesForDay(userId, ctx.day);
  const greeting = messages.find((m) => m.from === "kata" && m.kind === "greeting");
  let created: ICompanionMessage[] = [];
  // In focus Maru asks about nothing but the mission: the day's opening waits until focus ends.
  if (ctx.user.focusMissionId) return { ctx, messages, created };
  if (!greeting) created = await openDay(ctx);
  else if (eveningDue(ctx, messages, greeting)) created = await openEvening(ctx, messages);
  if (!greeting || created.length) messages = await messagesForDay(userId, ctx.day);
  return { ctx, messages, created };
}

// ── Answers ──────────────────────────────────────────────────────────────────

function isStatus(value: string): value is ThreadStatus {
  return (THREAD_STATUSES as readonly string[]).includes(value);
}

/** What happened to a thread, as a receipt that opens it. */
function threadReceipt(t: IThread, text: string, detail = ""): IReceipt {
  return { kind: "thread", text: text.slice(0, 80), detail: detail.slice(0, 240), href: `/threads?t=${String(t._id)}`, hue: t.hue ?? null };
}

/** One line to write down on a thread (what's in the way, the next step), saved by update_thread. */
function lineForm(t: IThread, key: "note" | "next_step", label: string, placeholder: string, value = ""): IChoice {
  return {
    label,
    detail: "",
    kind: "thread",
    tool: "update_thread",
    args: { thread: t.title },
    editable: false,
    public: false,
    inputs: [input(key, label, "text", { required: true, placeholder, value: value.slice(0, 300) })],
    action: "Save",
  };
}

/** How a habit's run stands after today: "Day one", "4-day streak". */
function runDetail(t: IThread, ctx: Ctx, counted: boolean): string {
  if (!counted) return "Already counted today";
  const run = liveStreak(t, ctx);
  if (run > 1) return habitRun(run, t.title);
  return (t.doneDays ?? []).length <= 1 ? "Day one" : "";
}

/**
 * Applies a chosen reply to the thread and says what happened, all of it from code: a receipt
 * for what changed, a line only when it adds something, and a form where there's something
 * worth writing down (what's in the way, on whom, the next step), never a question left open.
 */
async function threadReply(ctx: EngineCtx, t: IThread, chosen: IQuickReply, said: string): Promise<Draft> {
  const seed = seedFor(ctx, "follow", String(t._id), chosen.value);
  const base = { from: "kata" as const, threadId: t._id };

  if (chosen.value === "share") {
    const posted = await shareMoment(ctx.userId, { kind: "milestone", text: `Finished: ${t.title}`, tags: [], visibility: "public", threadTitle: t.title });
    if (!posted.ok) return { ...base, kind: "reply", text: NEEDS_PROFILE };
    await saveThread(ctx, t._id, { log: withLog(t.log, logItem("Shared on your profile", null, "kata", ctx.now)) });
    return { ...base, kind: "reply", text: "", done: [threadReceipt(t, "Shared on your profile", `Finished: ${t.title}`)] };
  }
  if (chosen.value === "keep") return { ...base, kind: "reply", text: followUp.kept };
  if (chosen.value === "later") return { ...base, kind: "reply", text: chosen.label === "Not yet" ? followUp.notYet : followUp.later(seed) };
  if (!isStatus(chosen.value)) return { ...base, kind: "reply", text: ack.noted(seed) };
  const status = chosen.value;

  // Ticking off the next step keeps it moving; anything else is a step, set the one way steps are set everywhere.
  const stepDone = chosen.label === STEP_DONE.label && chosen.value === STEP_DONE.value && Boolean(t.nextStep);
  const set: Partial<IThread> = stepChange(t, status, ctx, "", said) ?? {};
  if (stepDone) {
    Object.assign(set, touch(t, ctx), { nextStep: "", log: withLog(set.log ?? t.log, logItem(`Done: ${t.nextStep}`, null, "you", ctx.now)) });
  }
  const after = Object.keys(set).length ? ((await saveThread(ctx, t._id, set)) ?? t) : t;
  const done = (detail = "") => [threadReceipt(after, stepSaid(after, status), detail)];

  if (after.kind === "habit" && status === "done") {
    const log = logChoice(after);
    return { ...base, kind: "reply", text: "", done: done(runDetail(after, ctx, "doneDays" in set)), choices: log ? [log] : [] };
  }
  switch (status) {
    case "done":
      if (after.kind === "event" && chosen.label === "It was rough") return { ...base, kind: "reply", text: followUp.rough, done: done() };
      if (after.kind === "event" && chosen.label === "It went well") return { ...base, kind: "reply", text: followUp.wentWell, done: done() };
      if (after.shared) return { ...base, kind: "question", text: followUp.doneShare, replies: SHARE_REPLIES, done: done() };
      return { ...base, kind: "reply", text: followUp.done(seed), done: done() };
    case "moving": {
      const due = after.kind === "event" ? dueIn(after, ctx) : null;
      const ticked = stepDone ? [threadReceipt(after, `Done: ${stepText(t.nextStep)}`, after.title)] : done();
      // Finishing the prep for an event isn't finishing the event.
      if (stepDone && due !== null && due >= 0) return { ...base, kind: "reply", text: followUp.prepDone(due === 0 ? "today" : weekdayOf(addDays(ctx.day, due))), done: ticked };
      if (after.kind === "health" || after.kind === "person") return { ...base, kind: "reply", text: followUp.better, done: ticked };
      if (due === 0) return { ...base, kind: "reply", text: followUp.eventToday, done: ticked };
      if (due !== null && due > 0) return { ...base, kind: "reply", text: followUp.eventSoon(weekdayOf(addDays(ctx.day, due))), done: ticked };
      // Where it goes next is worth writing down: a form to fill in if they like.
      if (!NEXT_STEP_KINDS.has(after.kind) || after.nextStep) return { ...base, kind: "reply", text: "", done: ticked };
      return {
        ...base,
        kind: "question",
        text: "",
        done: ticked,
        choices: [lineForm(after, "next_step", `Next step on ${after.title}`, "Send the draft to Sam")],
        ...(stepDone ? { replies: [LAST_STEP] } : {}),
      };
    }
    case "stuck":
      return {
        ...base,
        kind: "question",
        text: "",
        done: done(),
        // Still stuck: what it was stuck on, to keep or change. Newly stuck: the old note was about something else.
        choices: [lineForm(after, "note", after.kind === "health" ? "What would help?" : "What’s in the way?", "Waiting on access, not sure where to start", t.status === "stuck" ? t.lastNote : "")],
      };
    case "waiting":
      // "Waiting on them" about a person already says on whom.
      if (after.kind === "person" || (status === t.status && t.lastNote)) return { ...base, kind: "reply", text: followUp.waitingKnown, done: done(t.lastNote) };
      return { ...base, kind: "question", text: followUp.waitingKnown, done: done(), choices: [lineForm(after, "note", "Waiting on whom?", "Sam, the bank, a reply")] };
    case "paused":
      // "It didn't happen" about an event isn't a pause.
      if (after.kind === "event") return { ...base, kind: "reply", text: followUp.paused, done: [threadReceipt(after, `${after.title} didn’t happen`)] };
      return { ...base, kind: "reply", text: followUp.paused, done: done() };
  }
}

/**
 * Records the writer's tap on a Kata message and writes Kata's follow-up. Their side says which
 * thread it was about ("Finish scrapers: Done"), so two answers in a row can't read the same.
 */
async function respond(ctx: EngineCtx, msg: ICompanionMessage, chosen: IQuickReply, said: string): Promise<ICompanionMessage[]> {
  const mood = (msg.kind === "mood" || msg.kind === "nudge") && /^[1-5]$/.test(chosen.value) ? Number(chosen.value) : null;
  const thread = mood === null && msg.threadId ? await Thread.findOne({ _id: msg.threadId, userId: ctx.userId, archived: false }).lean<IThread>() : null;
  const you: Draft = { from: "you", kind: "reply", text: thread ? `${thread.title}: ${said}` : said, threadId: msg.threadId, mood };
  let kata: Draft;
  if (mood !== null) {
    // The time they answer, not the time it was asked: a morning question tapped at night gets a night reply.
    const evening = msg.kind === "nudge" || isEvening(ctx.hour);
    kata = { from: "kata", kind: "reply", text: moodReply(mood, evening, seedFor(ctx, "mood-reply", String(msg._id))) };
  } else if (msg.threadId) {
    kata = thread ? await threadReply(ctx, thread, chosen, said) : { from: "kata", kind: "reply", text: followUp.gone, threadId: msg.threadId };
  } else {
    kata = { from: "kata", kind: "reply", text: ack.noted(seedFor(ctx, "noted", String(msg._id))) };
  }
  return insertDrafts(ctx.userId, ctx.day, [you, kata]);
}

async function claim(ctx: Ctx, msg: ICompanionMessage, value: string): Promise<void> {
  const res = await CompanionMessage.updateOne({ _id: msg._id, userId: ctx.userId, answer: null }, { $set: { answer: value } });
  if (!res.modifiedCount) throw new CompanionError("That message has already been answered.", 409);
}

export interface Exchange {
  ctx: EngineCtx;
  /** Everything this call wrote, oldest first. */
  created: ICompanionMessage[];
}

/** The writer tapped a quick reply. Each Kata message can be answered once. */
export async function answer(userId: string, messageId: string, value: string): Promise<Exchange> {
  if (!mongoose.isObjectIdOrHexString(messageId)) throw new CompanionError("Not found", 404);
  const today = await ensureToday(userId);
  const { ctx } = today;
  const msg = await CompanionMessage.findOne({ _id: messageId, userId, from: "kata" }).lean<ICompanionMessage>();
  if (!msg) throw new CompanionError("Not found", 404);
  // "Not now" works on any check-in, whatever answers it offers.
  const chosen = msg.replies.find((r) => r.value === value) ?? (value === "later" && msg.kind === "checkin" ? NOT_NOW : undefined);
  if (!chosen) throw new CompanionError("That isn’t one of the answers on offer.", 400);
  // A mood belongs to its day: yesterday's question tapped after the day turned doesn't count for today.
  if (msg.day !== ctx.day && (msg.kind === "mood" || msg.kind === "nudge")) throw new CompanionError("That was yesterday’s question.", 409);
  if (msg.kind === "checkin" && msg.threadId && value !== "later") {
    const settled = settledSince(await Thread.findOne({ _id: msg.threadId, userId: ctx.userId }).lean<IThread>(), value, ctx);
    if (settled) throw new CompanionError(settled, 409);
  }
  await claim(ctx, msg, value);
  return { ctx, created: [...today.created, ...(await respond(ctx, msg, chosen, chosen.label))] };
}

const NOT_NOW: IQuickReply = { label: "Not now", value: "later" };

/**
 * Why a check-in can't be answered any more: what it asked about has been settled some other way
 * since (done on its card, paused, archived, today already counted). An old question never
 * reopens or recounts anything. Null when it can still be answered.
 */
export function settledSince(t: IThread | null, value: string, ctx: Ctx): string | null {
  if (!t || t.archived) return followUp.gone;
  if (t.status === "done") return `${t.title} is already done.`;
  if (t.status === "paused") return `${t.title} is paused.`;
  if (t.kind === "habit" && value === "done" && !habitDone(t, ctx)) return `${t.title} is already done today.`;
  return null;
}

/**
 * The writer set a thread's step from its card in the conversation: the same rule and the same
 * follow-up as a check-in answer, from one of the thread's own steps. The message isn't answered,
 * so any other thread on it can still be set.
 */
export async function answerStep(userId: string, messageId: string, threadId: string, step: ThreadStatus): Promise<Exchange> {
  if (!mongoose.isObjectIdOrHexString(messageId) || !mongoose.isObjectIdOrHexString(threadId)) throw new CompanionError("Not found", 404);
  const today = await ensureToday(userId);
  const { ctx } = today;
  const msg = await CompanionMessage.findOne({ _id: messageId, userId, from: "kata" }).lean<ICompanionMessage>();
  if (!msg) throw new CompanionError("Not found", 404);
  if (!msg.choices.some((c) => c.tool === "thread" && c.args?.id === threadId)) throw new CompanionError("That thread isn’t on this message.", 400);
  const t = await Thread.findOne({ _id: threadId, userId: ctx.userId, archived: false }).lean<IThread>();
  if (!t) throw new CompanionError(followUp.gone, 404);
  const label = stepsFor(t.kind).find((s) => s.value === step)?.label;
  if (!label) throw new CompanionError("That isn’t a step for this thread.", 400);
  // Where it already is: nothing to say.
  if (!stepChange(t, step, ctx)) return { ctx, created: today.created };
  const kata = await threadReply(ctx, t, { label, value: step }, label);
  const created = await insertDrafts(ctx.userId, ctx.day, [{ from: "you", kind: "reply", text: `${t.title}: ${label}`, threadId: t._id }, kata]);
  return { ctx, created: [...today.created, ...created] };
}

// ── Free text ────────────────────────────────────────────────────────────────

/** The whole reply is "nothing" ("No access to staging" is a real answer). */
const NOTHING = /^(?:nothing|not sure|no idea|dunno|idk|i don't know|don't know|nope|no|not yet|tbd|n\/a|none)(?:\s+(?:yet|really|for now|right now))?[.!]?$/i;
const NEXT_STEP_KINDS = new Set<IThread["kind"]>(["project", "goal", "learning", "other"]);
const FINISHED = /^(?:that was (?:it|the last(?: one| step)?)|it'?s (?:done|finished)|all done|finished|nothing,? it'?s done)\b/i;
const FRESH_MS = 6 * 3_600_000;

const MOODS: [number, string][] = [
  [1, "foggy|groggy|hazy|in a fog"],
  [2, "low|down|sad|bad|rough|awful|terrible|not (?:great|good|well)|meh"],
  [3, "okay|ok|fine|alright|all right|so-so|not bad|average"],
  [4, "good|pretty good|well|great|happy|really good"],
  [5, "bright|amazing|excellent|fantastic|brilliant|wonderful|awesome"],
];

/** The mood in what they typed. `only` when that has to be all they said: "good idea" isn't a mood. */
function moodOf(text: string, only = false): number | null {
  const t = text.toLowerCase().replace(/[.!?]+$/, "").replace(/^(?:(?:i['’]?m|i am|feeling|a bit|kinda|quite)\s+)+/, "").trim();
  // "Good morning" is a hello.
  if (t.split(/\s+/).length > 4 || /\b(?:morning|afternoon|evening|night)\b/.test(t)) return null;
  const found = MOODS.find(([, words]) => new RegExp(`^(?:${words})${only ? "$" : "\\b"}`).test(t));
  return found ? found[0] : null;
}

/** A typed answer to a check-in, matched to one of its replies. The first reply is the "yes", unless the question turns them around. */
function replyFor(text: string, msg: ICompanionMessage): IQuickReply | null {
  const { replies } = msg;
  const t = text.toLowerCase().trim();
  const no = /^(?:no|nope)\b/.test(t);
  if (/\bstill (?:the case|stuck)\?/i.test(msg.text)) {
    if (/^(?:yes|yep|yeah|yup|sure)\b/.test(t)) return replies.find((r) => r.value === "stuck") ?? null;
    if (no) return replies[0] ?? null;
  }
  // "Any movement?" No: it stays as it is, which isn't the same as asking later.
  const same = no ? replies.find((r) => /^(?:Still |Not (?:really|quite))/.test(r.label)) : undefined;
  if (same) return same;
  if (/^(?:done|finished|all done)\b/.test(t)) {
    const done = replies.find((r) => r.value === "done");
    if (done) return done;
  }
  const status = statusIn(text);
  const byStatus = status ? replies.find((r) => r.value === status) : undefined;
  if (byStatus) return byStatus;
  if (/^(?:yes|yep|yeah|yup|sure|did it|done)\b/.test(t)) return replies[0] ?? null;
  if (/^(?:no|nope|not yet|later|not today)\b/.test(t)) return replies.find((r) => r.value === "later") ?? null;
  return null;
}

function clean(text: string, lead: RegExp, max: number): string {
  return trimEnd(text.trim().replace(lead, "")).slice(0, max);
}

const STEP_LEAD =
  /^(?:(?:the\s+)?next(?:\s+step)?(?:\s+is)?[:,]?\s+|i'll\s+|i will\s+|i need to\s+|need to\s+|going to\s+|gonna\s+|probably\s+|maybe\s+|then\s+|first\s+|just\s+|to\s+)+/i;

type Context =
  | { type: "question"; msg: ICompanionMessage; thread: IThread }
  | { type: "open"; msg: ICompanionMessage }
  | { type: "mood"; msg: ICompanionMessage; mood: number }
  | { type: "checkin"; msg: ICompanionMessage; thread: IThread }
  | { type: "none" };

/** What the writer is replying to: Kata's last open question, a mood check, a pending check-in, or nothing. */
async function contextOf(ctx: EngineCtx, messages: ICompanionMessage[], text: string): Promise<Context> {
  const last = messages[messages.length - 1];
  const pending = last && last.from === "kata" && last.answer === null ? last : null;
  const fresh = pending && ctx.now.getTime() - new Date(pending.createdAt).getTime() < FRESH_MS;

  if (pending?.kind === "question") {
    if (!pending.threadId) return { type: "open", msg: pending };
    const thread = fresh ? await Thread.findOne({ _id: pending.threadId, userId: ctx.userId }).lean<IThread>() : null;
    if (thread) return { type: "question", msg: pending, thread };
  }
  const mood = moodOf(text);
  const moodMsg = mood
    ? [...messages].reverse().find((m) => m.from === "kata" && (m.kind === "mood" || m.kind === "nudge") && m.answer === null)
    : undefined;
  if (mood && moodMsg) return { type: "mood", msg: moodMsg, mood };
  if (fresh && pending?.kind === "checkin" && pending.threadId) {
    const id = String(pending.threadId);
    const others = threadsMentioned(text, await knownThreads(ctx.userId)).filter((t) => t !== id);
    const thread = others.length ? null : await Thread.findOne({ _id: id, userId: ctx.userId }).lean<IThread>();
    if (thread) return { type: "checkin", msg: pending, thread };
  }
  return { type: "none" };
}

/** A short reply that names things rather than saying something: "the docs, then the API". */
function isNaming(text: string): boolean {
  return text.split(/\s+/).length <= 8 && !/[.!?]\s+\S/.test(text) && !/\?\s*$/.test(text);
}

/** "I'll keep track of the docs. Next up: the API." New threads are tracked; ones Kata had are named. */
function namedReply(applied: Applied, known: "Next up" | "Added to", seed: number): Draft | null {
  const existing = applied.updated.map((u) => u.after);
  const parts = [
    applied.created.length ? ack.tracking(joinList(applied.created.slice(0, 3).map(ref)), seed) : "",
    existing.length ? `${known} ${joinList(existing.slice(0, 2).map(ref))}.` : "",
  ].filter(Boolean);
  const named = [...applied.created, ...existing];
  if (!parts.length) return null;
  return { from: "kata", kind: "reply", text: parts.join(" "), threadId: named.length === 1 ? named[0]._id : null };
}

/** Free text after "What's in the way?", "On whom?", "What's the next step?" or "What's next?". */
async function answerQuestion(ctx: EngineCtx, messages: ICompanionMessage[], t: IThread, text: string): Promise<Draft> {
  const seed = seedFor(ctx, "answer", String(t._id));
  const base = { from: "kata" as const, threadId: t._id };
  const r = ref(t);
  if (NOTHING.test(text) && !FINISHED.test(text)) {
    const due = t.kind === "event" ? dueIn(t, ctx) : null;
    return { ...base, kind: "reply", text: due !== null && due >= 0 ? followUp.allSet : ack.noRush };
  }

  if (t.status === "done") {
    if (!isNaming(text)) return general(ctx, messages, text);
    const found = candidatesFromItems(splitList(text), { known: await knownThreads(ctx.userId), today: ctx.day });
    const applied = await applyCandidates(ctx, found.filter((c) => c.threadId !== String(t._id)), { from: "you", source: "kata" });
    return namedReply(applied, "Next up", seed) ?? { ...base, kind: "reply", text: ack.noted(seed) };
  }

  if (FINISHED.test(text) && t.status === "moving") {
    return threadReply(ctx, t, { label: "Done", value: "done" }, text);
  }

  if (t.status === "stuck") {
    const note = clean(text, /^(?:it's\s+|its\s+|the problem is\s+|because\s+)/i, 280);
    await saveThread(ctx, t._id, { ...touch(t, ctx), lastNote: note, log: withLog(t.log, logItem(text, null, "you", ctx.now)) });
    return { ...base, kind: "reply", text: ack.blocker(r) };
  }

  if (t.status === "waiting") {
    const whom = clean(text, /^(?:still\s+)?(?:waiting\s+(?:on|for)\s+|on\s+|for\s+)/i, 280);
    await saveThread(ctx, t._id, { ...touch(t, ctx), lastNote: whom, log: withLog(t.log, logItem(text, null, "you", ctx.now)) });
    return { ...base, kind: "reply", text: isShortPhrase(whom) ? ack.whom(noteText(whom)) : ack.whomLong };
  }

  const step = clean(text, STEP_LEAD, 140);
  await saveThread(ctx, t._id, { ...touch(t, ctx), nextStep: step, log: withLog(t.log, logItem(`Next: ${step}`, null, "you", ctx.now)) });
  return { ...base, kind: "reply", text: ack.step(r, stepText(step)) };
}

/** Free text that answers nothing in particular: track what it names, otherwise a short acknowledgement. */
async function general(ctx: EngineCtx, messages: ICompanionMessage[], text: string): Promise<Draft> {
  const seed = seedFor(ctx, "say", String(messages.length));
  const known = await knownThreads(ctx.userId);

  // A question to Kata changes nothing; if it's about a thread, say what Kata knows about it.
  if (/\?\s*$/.test(text)) {
    const [id] = threadsMentioned(text, known);
    const t = id ? await Thread.findOne({ _id: id, userId: ctx.userId }).lean<IThread>() : null;
    if (!t) return { from: "kata", kind: "reply", text: ack.cantAnswer };
    // "Is it still waiting?" is answered by the fact; "What should I do?" isn't.
    const asksState = /\b(?:still|status|where|stuck|waiting|done|finished|next step|what's next|how's|how is|any news|update)\b/i.test(text);
    const fact = threadFact(t, ctx);
    return { from: "kata", kind: "reply", text: asksState ? fact : ack.noAnswer(fact), threadId: t._id };
  }

  const applied = await applyCandidates(ctx, await threadsFromText(text, { known, today: ctx.day }), {
    from: "you",
    source: "kata",
  });
  const parts: string[] = [];
  const done: IReceipt[] = [];
  // At most one thing to follow up on: a form, or a yes-or-no with its buttons.
  let ask: Pick<Draft, "text" | "replies" | "choices" | "threadId"> | null = null;
  if (applied.created.length) parts.push(ack.tracking(joinList(applied.created.slice(0, 3).map(ref)), seed));

  const mentioned: IThread[] = [];
  for (const { before, after } of applied.updated) {
    if (after.kind === "habit") {
      // A habit's touchCount only moves when it's done for the day.
      if (after.touchCount !== before.touchCount) done.push(threadReceipt(after, stepSaid(after, "done"), runDetail(after, ctx, true)));
      else mentioned.push(after);
      continue;
    }
    if (after.status === before.status) {
      mentioned.push(after);
      continue;
    }
    done.push(threadReceipt(after, stepSaid(after, after.status), after.status === "stuck" || after.status === "waiting" ? after.lastNote : ""));
    if (after.status === "done") {
      if (!ask && after.shared) ask = { text: followUp.doneShare, replies: SHARE_REPLIES, threadId: after._id };
      continue;
    }
    if (!ask && after.status === "stuck" && !after.lastNote) ask = { text: "", choices: [lineForm(after, "note", "What’s in the way?", "Waiting on access, not sure where to start")], threadId: after._id };
    if (!ask && after.status === "waiting" && !after.lastNote) ask = { text: "", choices: [lineForm(after, "note", "Waiting on whom?", "Sam, the bank, a reply")], threadId: after._id };
  }
  if (!parts.length && !done.length && !ask && mentioned.length) parts.push(ack.added(joinList(mentioned.slice(0, 2).map(ref))));

  if (!parts.length && !done.length && !ask) {
    const words = text.split(/\s+/).length;
    let line: string = ack.noted(seed);
    if (words <= 4 && /^(?:hi|hello|hey|morning|good morning|evening|good evening)\b/i.test(text)) line = ack.hello(ctx.first);
    else if (/\b(?:thanks|thank you|cheers)\b/i.test(text)) line = ack.thanks;
    else if (/\b(?:tired|exhausted|stressed|overwhelmed|anxious|burnt out|burned out|drained|lonely|sick)\b/i.test(text)) line = ack.heavy(seed);
    else if (/\b(?:great news|excited|thrilled|proud|went well|good day)\b/i.test(text)) line = ack.glad;
    const hasThreads = (await activeThreads(ctx)).length > 0;
    const askedOpen = messages.some((m) => m.from === "kata" && m.kind === "question" && !m.threadId);
    if (!hasThreads && !askedOpen) {
      const open = openQuestion(roleKeyOf(ctx.user.role), interestTags(ctx.user.interests), seedFor(ctx, "open"));
      return { from: "kata", kind: "question", text: `${line} ${open}` };
    }
    return { from: "kata", kind: "reply", text: line };
  }

  const involved = [...applied.created, ...applied.updated.map((u) => u.after)];
  // One thing named and nothing else to ask: its next step is worth writing down, so Kata has something to follow up on.
  const only = involved.length === 1 ? involved[0] : null;
  if (!ask && only && only.status === "moving" && !only.nextStep && NEXT_STEP_KINDS.has(only.kind)) {
    ask = { text: "", choices: [lineForm(only, "next_step", `Next step on ${only.title}`, "Send the draft to Sam")], threadId: only._id };
  }
  return {
    from: "kata",
    kind: ask ? "question" : "reply",
    text: [...parts, ask?.text].filter(Boolean).join(" "),
    done,
    replies: ask?.replies ?? [],
    choices: ask?.choices ?? [],
    threadId: ask?.threadId ?? (involved.length === 1 ? involved[0]._id : null),
  };
}

// Small talk isn't news: with no model to tell the difference, "thanks" would become a next step.
const CHATTER = /^(?:hi|hello|hey|good (?:morning|afternoon|evening|night)|thanks|thank you|thx|ty|yes|yep|yeah|no|nope|ok|okay|cool|nice|good|great|fine|idk|i don['’]?t know|not sure|nothing|nothing really|tired|lol|haha)[.!?\s]*$/i;
const ASKS_TO_STOP = /\b(?:stop|delete|remove|archive|pause)\b/i;

/**
 * A mood typed instead of tapped: it counts the same, and needs no model. Only as the answer to
 * the day's mood question, so an "ok" later in a conversation stays a word in that conversation.
 */
export async function moodSaid(userId: string, raw: string): Promise<Exchange | null> {
  const text = raw.trim().slice(0, 1000);
  const mood = moodOf(text, true);
  if (!mood) return null;
  const { ctx, messages } = await ensureToday(userId);
  const msg = [...messages].reverse().find((m) => m.from === "kata" && (m.kind === "mood" || m.kind === "nudge") && m.answer === null);
  if (!msg || messages.some((m) => m.from === "you" && m.createdAt > msg.createdAt)) return null;
  await claim(ctx, msg, String(mood));
  const chosen = MOOD_REPLIES.find((r) => r.value === String(mood)) as IQuickReply;
  return { ctx, created: await respond(ctx, msg, chosen, text) };
}

/** The writer typed something. */
export async function say(userId: string, raw: string): Promise<Exchange> {
  const today = await ensureToday(userId);
  const { ctx, messages } = today;
  const text = raw.trim().slice(0, 1000);
  const context = await contextOf(ctx, messages, text);
  let out: ICompanionMessage[];

  switch (context.type) {
    case "mood": {
      await claim(ctx, context.msg, String(context.mood));
      const chosen = MOOD_REPLIES.find((r) => r.value === String(context.mood)) as IQuickReply;
      out = await respond(ctx, context.msg, chosen, text);
      break;
    }
    case "checkin": {
      const chosen = replyFor(text, context.msg);
      if (chosen) {
        await claim(ctx, context.msg, chosen.value);
        out = await respond(ctx, context.msg, chosen, text);
        break;
      }
      const t = context.thread;
      if (CHATTER.test(text) || ASKS_TO_STOP.test(text)) {
        const reply = ASKS_TO_STOP.test(text) ? ack.onThreads : ack.noted(seedFor(ctx, "noted", String(context.msg._id)));
        out = await insertDrafts(ctx.userId, ctx.day, [{ from: "you", kind: "reply", text, threadId: t._id }, { from: "kata", kind: "reply", text: reply, threadId: t._id }]);
        break;
      }
      await saveThread(ctx, t._id, {
        ...(t.kind === "habit" ? {} : touch(t, ctx)),
        lastNote: text.slice(0, 280),
        log: withLog(t.log, logItem(text, null, "you", ctx.now)),
      });
      out = await insertDrafts(ctx.userId, ctx.day, [
        { from: "you", kind: "reply", text, threadId: t._id },
        { from: "kata", kind: "reply", text: ack.added(ref(t)), threadId: t._id },
      ]);
      break;
    }
    case "question": {
      if (CHATTER.test(text)) {
        out = await insertDrafts(ctx.userId, ctx.day, [{ from: "you", kind: "reply", text, threadId: context.thread._id }, { from: "kata", kind: "reply", text: ack.noted(seedFor(ctx, "noted", "chatter")), threadId: context.thread._id }]);
        break;
      }
      const kata = await answerQuestion(ctx, messages, context.thread, text);
      out = await insertDrafts(ctx.userId, ctx.day, [{ from: "you", kind: "reply", text, threadId: context.thread._id }, kata]);
      break;
    }
    case "open": {
      if (CHATTER.test(text)) {
        out = await insertDrafts(ctx.userId, ctx.day, [{ from: "you", kind: "note", text }, { from: "kata", kind: "reply", text: ack.noted(seedFor(ctx, "noted", "chatter")) }]);
        break;
      }
      const opts = { known: await knownThreads(ctx.userId), today: ctx.day };
      const found = text.split(/\s+/).length <= 25 ? candidatesFromItems(splitList(text), opts) : await threadsFromText(text, opts);
      const applied = await applyCandidates(ctx, found, { from: "you", source: "kata" });
      const seed = seedFor(ctx, "open-answer");
      out = await insertDrafts(ctx.userId, ctx.day, [
        { from: "you", kind: "reply", text },
        namedReply(applied, "Added to", seed) ?? { from: "kata", kind: "reply", text: ack.noted(seed) },
      ]);
      break;
    }
    case "none":
      out = await insertDrafts(ctx.userId, ctx.day, [{ from: "you", kind: "note", text }, await general(ctx, messages, text)]);
      break;
  }
  return { ctx, created: [...today.created, ...out] };
}
