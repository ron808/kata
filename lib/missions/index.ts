import mongoose, { Types } from "mongoose";
import { complete, FAST_MODELS, isGroqConfigured } from "@/lib/ai/groq";
import { Mission, TASKS_MAX, type IMission } from "@/lib/db/models/Mission";
import { Thread, threadKey, type IThread } from "@/lib/db/models/Thread";
import { User, type FocusTheme } from "@/lib/db/models/User";
import type { EngineCtx } from "@/lib/companion/engine";
import { habitDone, logItem, nextHue, createThread, saveThread, touch, withLog, type Ctx } from "@/lib/companion/threads";
import { clockIn } from "@/lib/companion/time";
import type { FocusState, MissionT, TaskT } from "@/lib/types";
import { apply, leftOn, newTask, type Change, type Patch } from "./apply";
import { lasted, focusedFor, isOpen, missionName, nextUp, spentOn, tally } from "./core";
import type { ParsedTask } from "./parse";
import { sameClock } from "./parse";

/** Times on the writer's own clock: "6:30 pm". */
export function clockText(at: Date, tz: string): string {
  const [hour, minute] = clockIn(tz, at);
  const h = hour % 12 || 12;
  return `${h}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
}

const dayText = (at: Date, tz: string) => at.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz });

function toTaskT(t: IMission["tasks"][number], tz: string): TaskT {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    hue: t.hue,
    at: t.at ? new Date(t.at).toISOString() : null,
    atText: t.at ? clockText(new Date(t.at), tz) : "",
    minutes: t.minutes ?? null,
    spentMs: t.spentMs ?? 0,
    startedAt: t.startedAt ? new Date(t.startedAt).toISOString() : null,
    doneAt: t.doneAt ? new Date(t.doneAt).toISOString() : null,
    note: t.note ?? "",
  };
}

export function toMissionT(m: IMission, ctx: Pick<Ctx, "tz" | "day" | "now">): MissionT {
  const ends = m.endsAt ? new Date(m.endsAt) : null;
  // A time that's more than a day off reads better as a date.
  const far = ends && Math.abs(ends.getTime() - ctx.now.getTime()) > 86_400_000;
  return {
    _id: String(m._id),
    name: missionName(m, ctx.day),
    title: m.title,
    day: m.day,
    status: m.status,
    tasks: m.tasks.map((t) => toTaskT(t, ctx.tz)),
    endsAt: ends?.toISOString() ?? null,
    endsText: ends ? (far ? dayText(ends, ctx.tz) : clockText(ends, ctx.tz)) : "",
    focusMs: m.focusMs,
    focusedAt: m.focusedAt ? new Date(m.focusedAt).toISOString() : null,
    askedAt: m.askedAt ? new Date(m.askedAt).toISOString() : null,
    log: m.log.map((l) => ({ at: new Date(l.at).toISOString(), text: l.text })),
    startedAt: new Date(m.createdAt).toISOString(),
    endedAt: m.endedAt ? new Date(m.endedAt).toISOString() : null,
    take: m.take,
    now: ctx.now.toISOString(),
  };
}

const isId = (id: string) => mongoose.isObjectIdOrHexString(id);

export async function getMission(ctx: Pick<Ctx, "userId">, id: string): Promise<IMission | null> {
  if (!isId(id)) return null;
  return Mission.findOne({ _id: id, userId: ctx.userId }).lean<IMission>();
}

const LIST_FIELDS = "title day status tasks endsAt focusMs focusedAt askedAt endedAt take fromId createdAt updatedAt";

/** What's open, newest first, and the last of what's finished. The logs stay behind: lists don't show them. */
export async function listMissions(ctx: Pick<Ctx, "userId">): Promise<{ open: IMission[]; past: IMission[] }> {
  const [open, past] = await Promise.all([
    Mission.find({ userId: ctx.userId, status: "open" }).sort({ updatedAt: -1 }).limit(12).select(LIST_FIELDS).lean<IMission[]>(),
    Mission.find({ userId: ctx.userId, status: { $ne: "open" } }).sort({ endedAt: -1 }).limit(30).select(LIST_FIELDS).lean<IMission[]>(),
  ]);
  return { open: open.map(withLog0), past: past.map(withLog0) };
}

const withLog0 = (m: IMission): IMission => ({ ...m, log: m.log ?? [] });

export async function openMissions(ctx: Pick<Ctx, "userId">): Promise<IMission[]> {
  return (await Mission.find({ userId: ctx.userId, status: "open" }).sort({ updatedAt: -1 }).limit(6).select(LIST_FIELDS).lean<IMission[]>()).map(withLog0);
}

/** Tasks named like a thread they already keep belong to it: done here counts there too. */
async function linked(ctx: Ctx, tasks: IMission["tasks"]): Promise<IMission["tasks"]> {
  if (!tasks.length) return tasks;
  const threads = await Thread.find({ userId: ctx.userId, archived: false, key: { $in: tasks.map((t) => threadKey(t.title)) } })
    .select("key")
    .lean<Pick<IThread, "_id" | "key">[]>();
  const byKey = new Map(threads.map((t) => [t.key, t._id]));
  return tasks.map((t) => {
    const threadId = byKey.get(threadKey(t.title));
    return threadId ? { ...t, threadId } : t;
  });
}

export interface NewMission {
  title?: string;
  day?: string;
  tasks: ParsedTask[];
  endsAt?: Date | null;
  fromId?: Types.ObjectId | null;
}

export async function createMission(ctx: Ctx, input: NewMission): Promise<IMission> {
  const tasks = await linked(ctx, input.tasks.slice(0, TASKS_MAX).map((t, i) => newTask(t, i)));
  const doc = await Mission.create({
    userId: ctx.userId,
    title: (input.title ?? "").trim().slice(0, 80),
    day: input.day ?? ctx.day,
    tasks,
    endsAt: input.endsAt ?? null,
    fromId: input.fromId ?? null,
  });
  return doc.toObject() as IMission;
}

/** Runs a change on the mission as it is now; if it moved under us (another tab), once more on the fresh one. */
export async function changeMission(ctx: Ctx, id: string, change: Change): Promise<IMission | null> {
  for (let tries = 0; tries < 3; tries++) {
    const m = await getMission(ctx, id);
    if (!m) return null;
    const patch = apply(m, change, ctx.now);
    if (change.do === "add") patch.tasks = await linkNew(ctx, m, patch);
    const saved = await Mission.findOneAndUpdate(
      { _id: m._id, userId: ctx.userId, updatedAt: m.updatedAt },
      { $set: patch },
      { returnDocument: "after" }
    ).lean<IMission>();
    if (saved) {
      if (change.do === "done") await countOnThread(ctx, m, change.task);
      return saved;
    }
  }
  return null;
}

async function linkNew(ctx: Ctx, m: IMission, patch: Patch) {
  const old = new Set(m.tasks.map((t) => t.id));
  const added = await linked(ctx, patch.tasks.filter((t) => !old.has(t.id)));
  return [...patch.tasks.filter((t) => old.has(t.id)), ...added];
}

/** Done on a task named like one of their threads: a habit counts the day, anything else moves. */
async function countOnThread(ctx: Ctx, m: IMission, taskId: string) {
  const task = m.tasks.find((t) => t.id === taskId);
  if (!task?.threadId) return;
  const thread = await Thread.findOne({ _id: task.threadId, userId: ctx.userId, archived: false }).lean<IThread>();
  if (!thread || thread.status === "done") return;
  const line = logItem(`Done on a mission: ${task.title}`, null, "kata", ctx.now);
  if (thread.kind === "habit") {
    const did = habitDone(thread, ctx);
    if (did) await saveThread(ctx, thread._id, { ...did, log: withLog(thread.log, line) });
    return;
  }
  await saveThread(ctx, thread._id, { ...touch(thread, ctx), log: withLog(thread.log, line) });
}

/** Turns focus on for a mission. Only one at a time, so another one in focus steps down first. */
export async function focusOn(ctx: Ctx, id: string): Promise<IMission | null> {
  const user = await User.findById(ctx.userId).select("focusMissionId").lean();
  const current = user?.focusMissionId ? String(user.focusMissionId) : null;
  if (current && current !== id) await changeMission(ctx, current, { do: "unfocus" }).catch(() => null);
  const m = await changeMission(ctx, id, { do: "focus" });
  if (m) await User.updateOne({ _id: ctx.userId }, { $set: { focusMissionId: m._id } });
  return m;
}

/** Back to normal: the list stays, and everything else comes back. */
export async function focusOff(ctx: Ctx): Promise<IMission | null> {
  const user = await User.findById(ctx.userId).select("focusMissionId").lean();
  if (!user?.focusMissionId) return null;
  await User.updateOne({ _id: ctx.userId }, { $set: { focusMissionId: null } });
  return changeMission(ctx, String(user.focusMissionId), { do: "unfocus" }).catch(() => null);
}

/** Ending a mission ends its focus. */
export async function endMission(ctx: Ctx, id: string, how: "finish" | "drop"): Promise<IMission | null> {
  const m = await changeMission(ctx, id, { do: how });
  if (m) await User.updateOne({ _id: ctx.userId, focusMissionId: m._id }, { $set: { focusMissionId: null } });
  return m;
}

/**
 * The mission they're focused on. A focus left on overnight stops at the last thing that
 * happened, and they're told: Maru mustn't report ten hours of "work" nobody did.
 */
export async function focusedMission(ctx: EngineCtx): Promise<{ mission: IMission | null; leftAt: Date | null }> {
  const id = ctx.user.focusMissionId;
  if (!id) return { mission: null, leftAt: null };
  const m = await getMission(ctx, String(id));
  if (!m || m.status !== "open" || !m.focusedAt) {
    await User.updateOne({ _id: ctx.userId }, { $set: { focusMissionId: null } });
    ctx.user = { ...ctx.user, focusMissionId: null };
    return { mission: null, leftAt: null };
  }
  const leftAt = leftOn(m, ctx.now);
  if (!leftAt) return { mission: m, leftAt: null };
  await Mission.updateOne({ _id: m._id }, { $set: apply(m, { do: "unfocus" }, leftAt) });
  await User.updateOne({ _id: ctx.userId }, { $set: { focusMissionId: null } });
  ctx.user = { ...ctx.user, focusMissionId: null };
  return { mission: null, leftAt };
}

/** What the shell needs to wear focus on every page, read with the rest of the shell. */
export async function focusState(userId: string, missionId: Types.ObjectId, theme: FocusTheme, day: string): Promise<FocusState | null> {
  const m = await Mission.findOne({ _id: missionId, userId, status: "open" }).select("title day endsAt focusMs focusedAt").lean<IMission>();
  if (!m?.focusedAt) return null;
  return {
    missionId: String(m._id),
    name: missionName(m, day),
    theme,
    endsAt: m.endsAt ? new Date(m.endsAt).toISOString() : null,
    focusMs: m.focusMs,
    focusedAt: new Date(m.focusedAt).toISOString(),
    now: new Date().toISOString(),
  };
}

/** The same list again, from the start: its tasks, its clock times, its timers. */
export async function runAgain(ctx: Ctx, id: string): Promise<IMission | null> {
  const old = await getMission(ctx, id);
  if (!old) return null;
  const tasks: ParsedTask[] = old.tasks.map((t) => ({
    title: t.title,
    at: t.at ? sameClock(new Date(t.at), ctx.day, ctx.tz) : null,
    minutes: t.minutes ?? null,
  }));
  return createMission(ctx, { title: old.title, tasks, fromId: old._id });
}

/** What wasn't finished, kept as real threads when the list ends. Those they already keep are left alone. */
export async function keepAsThreads(ctx: Ctx, id: string): Promise<string[]> {
  const m = await getMission(ctx, id);
  if (!m) return [];
  const kept: string[] = [];
  let hue = await nextHue(ctx.userId);
  for (const t of m.tasks) {
    if (!isOpen(t) || t.threadId) continue;
    const made = await createThread(ctx, { title: t.title, kind: "task", source: "kata", said: t.title, from: "you", ...(t.note ? { lastNote: t.note } : {}) }, hue);
    if (made) {
      kept.push(t.title);
      hue = (hue + 1) % 8;
    }
  }
  return kept;
}

/** Their name on Maru's few sentences. Everything else on a report is worked out in code. */
const TAKE_PROMPT = (name: string, first: string) =>
  `You are ${name}, the companion in ${first || "the writer"}'s journal app. They've just finished a mission: a short temporary list of things to do. Write two or three sentences to them about how it went, from the facts only. Say what stands out: what got done, where the time really went, what got stuck. No score, no praise for its own sake, no emoji, no exclamation marks. Plain words.`;

/** The facts of a mission in a few lines, for Maru. Short, because it goes with every message in focus. */
export function missionLines(m: IMission, ctx: Pick<Ctx, "tz" | "day" | "now">): string {
  const now = ctx.now.getTime();
  const { done, total } = tally(m.tasks);
  const focused = focusedFor(m, now);
  const ends = m.endsAt ? new Date(m.endsAt) : null;
  const head = [
    `Mission "${missionName(m, ctx.day)}"`,
    `${done} of ${total} done`,
    focused >= 60_000 ? `focused ${lasted(focused)}` : "",
    ends ? `ends ${clockText(ends, ctx.tz)}${ends.getTime() > now ? ` (${lasted(ends.getTime() - now)} left)` : " (time's up)"}` : "",
  ].filter(Boolean);
  const up = nextUp(m.tasks, now);
  const line = (t: IMission["tasks"][number]) => {
    const parts = [`"${t.title}"`];
    if (t.at) parts.push(`at ${clockText(new Date(t.at), ctx.tz)}`);
    const spent = spentOn(t, now);
    if (t.minutes) parts.push(`${Math.round(spent / 60_000)} of ${t.minutes} min`);
    else if (spent >= 60_000) parts.push(lasted(spent));
    if (t.status === "stuck") parts.push(`stuck${t.note ? `: ${t.note}` : ""}`);
    else if (t.note) parts.push(`note: ${t.note}`);
    return parts.join(" ");
  };
  const left = m.tasks.filter((t) => isOpen(t) && t !== up);
  const finished = m.tasks.filter((t) => t.status === "done");
  return [
    head.join(", "),
    up ? `${up.startedAt ? "On now" : "Next"}: ${line(up)}` : "",
    left.length ? `Left: ${left.map(line).join("; ")}` : "",
    finished.length ? `Done: ${finished.map(line).join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeTake(ctx: Pick<EngineCtx, "userId" | "tz" | "day" | "now" | "companion" | "first">, id: string): Promise<string | null> {
  const m = await getMission(ctx, id);
  if (!m) return null;
  if (m.take) return m.take;
  if (!isGroqConfigured() || !m.tasks.length) return "";
  const notes = m.log.slice(-12).map((l) => l.text).join("; ");
  const res = await complete(
    {
      messages: [
        { role: "system", content: TAKE_PROMPT(ctx.companion, ctx.first) },
        { role: "user", content: `${missionLines(m, ctx)}${notes ? `\nHow it went: ${notes}` : ""}` },
      ],
      temperature: 0.5,
      max_tokens: 400,
    },
    { models: FAST_MODELS, timeout: 15_000 }
  );
  const take = (res.choices[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim().slice(0, 600);
  if (take) await Mission.updateOne({ _id: m._id, take: "" }, { $set: { take } });
  return take;
}
