import { CompanionMessage, type ICompanionMessage } from "@/lib/db/models/CompanionMessage";
import { openMissions, toMissionT } from "@/lib/missions";
import { nextUp, missionName, tally } from "@/lib/missions/core";
import { whereWeAre } from "@/lib/missions/prompts";
import { interestTags, roleKeyOf } from "@/lib/questions/daily";
import type { KataMessage } from "@/lib/types";
import { checkinLine, chooseCheckins } from "./checkins";
import { isEvening, moodQuestion, openQuestion } from "./copy";
import { activeThreads, ensureToday, historyFor, type EngineCtx } from "./engine";
import { logChoice } from "./forms";
import { insertDrafts, MOOD_REPLIES, toKataMessage, type Draft } from "./messages";
import { count, pick, seedOf } from "./text";
import { hourIn } from "@/lib/utils/dates";

/**
 * Maru says hi whenever they come back, and asks something real: where a mission stands, how
 * the day's going, a thread that's due. It's worked out here with no model, and an unanswered
 * hello is replaced by the next one, so coming and going costs no tokens and stores one message.
 */

// Just talked, or the day's opening a moment ago: that's a hello already.
const RECENT_MS = 20 * 60_000;

function greet(ctx: EngineCtx): string {
  const name = ctx.first ? `, ${ctx.first}` : "";
  if (ctx.hour < 4) return `Still up${name}?`;
  return pick([`Hi again${name}.`, `Back again${name}.`, `Good to see you${name}.`], seedOf(ctx.userId, ctx.day, ctx.hour));
}

const say = (label: string) => ({ label, value: `say:${label}` });

/** The first thing there really is to ask, most specific first. */
async function helloDraft(ctx: EngineCtx, messages: ICompanionMessage[]): Promise<Draft> {
  const hi = greet(ctx);
  const seed = seedOf(ctx.userId, ctx.day, ctx.hour, "hello");
  const base = { from: "kata" as const, hello: true };

  // A list that's still going comes first: it's what they said they'd do.
  const missions = await openMissions(ctx);
  const going = missions.filter((m) => tally(m.tasks).left > 0);
  const stale = going.find((m) => !m.title && m.day < ctx.day);
  if (stale) {
    const name = missionName(stale, ctx.day);
    const left = tally(stale.tasks).left;
    return {
      ...base,
      kind: "question",
      text: `${hi} ${name} has ${count(left)} thing${left === 1 ? "" : "s"} left. Bring ${left === 1 ? "it" : "them"} to today?`,
      choices: [
        { label: left === 1 ? "Bring it over" : "Bring them over", detail: "", kind: "mission", tool: "carry_mission", args: { mission: String(stale._id) }, editable: false, public: false, inputs: [], action: "" },
        { label: "Wrap it up", detail: "", kind: "mission", tool: "end_mission", args: { how: "finish", mission: name }, editable: false, public: false, inputs: [], action: "" },
      ],
    };
  }
  // A list for another day waits for its day.
  const now = going.filter((m) => m.day <= ctx.day);
  if (now.length) {
    const m = now[0];
    const name = missionName(m, ctx.day);
    const up = nextUp(m.tasks, ctx.now.getTime());
    return {
      ...base,
      kind: "question",
      text: `${hi} ${whereWeAre(toMissionT(m, ctx), ctx.now.getTime())} Back to it?`,
      choices: [{ label: "Turn on focus", detail: up ? up.title : name, kind: "mission", tool: "set_focus", args: { on: true, mission: name }, editable: false, public: false, inputs: [], action: "" }],
    };
  }

  // The day's mood question, if it's still open: asked again here, in place of the old one.
  const open = messages.filter((m) => m.from === "kata" && (m.kind === "mood" || m.kind === "nudge") && m.answer === null);
  const moodLate = isEvening(ctx.hour) && !messages.some((m) => m.from === "kata" && (m.kind === "mood" || m.kind === "nudge") && isEvening(hourIn(ctx.tz, new Date(m.createdAt))));
  if (open.length || moodLate) {
    if (open.length) await CompanionMessage.updateMany({ _id: { $in: open.map((m) => m._id) } }, { $set: { answer: "later" } });
    return { ...base, kind: "mood", text: `${hi} ${moodQuestion(ctx.hour, seed)}`, replies: MOOD_REPLIES };
  }

  // A thread that's due a word and hasn't had one today.
  const threads = await activeThreads(ctx);
  if (!threads.length) {
    return { ...base, kind: "question", text: `${hi} ${openQuestion(roleKeyOf(ctx.user.role), interestTags(ctx.user.interests), seed)}` };
  }
  const askedToday = new Set(messages.filter((m) => m.kind === "checkin").map((m) => String(m.threadId)));
  const planned = chooseCheckins(threads, ctx, await historyFor(ctx)).find((p) => !askedToday.has(String(p.thread._id)));
  if (planned) {
    const line = checkinLine(planned, ctx, seed, isEvening(ctx.hour));
    const log = logChoice(planned.thread);
    return { ...base, kind: "checkin", text: `${hi} ${line.text}`, threadId: planned.thread._id, replies: line.replies, choices: log ? [log] : [] };
  }

  if (ctx.hour < 4) {
    return { ...base, kind: "question", text: `${hi} Anything on your mind before you sleep?`, replies: [say("Open today’s page"), { label: "Just looking", value: "later" }] };
  }
  return { ...base, kind: "question", text: `${hi} What’s next?`, replies: [say("Make a to-do list"), say("Open today’s page")] };
}

/** A hello for someone who's just come back, or null when one wouldn't make sense. */
export async function sayHello(userId: string): Promise<KataMessage | null> {
  const { ctx, messages, created } = await ensureToday(userId);
  // The day's first visit has its own greeting, and focus has its own questions.
  if (created.length || ctx.user.focusMissionId) return null;
  const said = messages.filter((m) => !(m.hello && m.answer === null));
  const last = said.at(-1);
  if (last && ctx.now.getTime() - new Date(last.createdAt).getTime() < RECENT_MS) return null;
  const stale = messages.filter((m) => m.hello && m.answer === null).map((m) => m._id);
  const draft = await helloDraft(ctx, said);
  const [message] = await insertDrafts(ctx.userId, ctx.day, [draft]);
  if (stale.length) await CompanionMessage.deleteMany({ _id: { $in: stale }, userId: ctx.userId, answer: null });
  return toKataMessage(message);
}
