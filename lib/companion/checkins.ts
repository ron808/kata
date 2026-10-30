import type { IQuickReply } from "@/lib/db/models/CompanionMessage";
import type { IThread } from "@/lib/db/models/Thread";
import { addDays, dayDiff, localDay, monthDayOf, weekdayOf, whenPhrase } from "./time";
import {
  capFirst,
  count,
  gerundPhrase,
  isClause,
  isShortPhrase,
  noteText,
  pick,
  quote,
  ref,
  refIsActivity,
  startsWithVerb,
  stepText,
} from "./text";
import { dueIn, liveStreak, type Ctx } from "./threads";

/**
 * Which threads Kata asks about each day, and how it asks. Every line uses only
 * what the thread itself records; nothing is inferred.
 */

export type Tier =
  | "stuck"
  | "waiting"
  | "event-past"
  | "event-today"
  | "event-soon"
  | "habit"
  | "stale"
  | "step"
  | "new";

export interface Planned {
  thread: IThread;
  tier: Tier;
}

export interface History {
  /** Thread id → the answer to yesterday's check-in on it (null if it went unanswered). */
  yesterday: Map<string, string | null>;
  /** Threads Kata has ever checked in on. */
  asked: Set<string>;
}

const reply = (label: string, value: string): IQuickReply => ({ label, value });

/** "Did it" on a next-step check-in: the step is done and the thread moves on. */
export const STEP_DONE = reply("Did it", "moving");
/** Offered after a step is done, when there's no step after it. */
export const LAST_STEP = reply("That was the last one", "done");
export const SHARE_REPLIES = [reply("Share it", "share"), reply("Keep it here", "keep")];

const R = {
  unstuck: reply("Unstuck", "moving"),
  stillStuck: reply("Still stuck", "stuck"),
  done: reply("Done", "done"),
  parkIt: reply("Park it", "paused"),
  cameThrough: reply("It came through", "moving"),
  heardBack: reply("Heard back", "moving"),
  stillWaiting: reply("Still waiting", "waiting"),
  landed: reply("Landed", "done"),
  later: reply("Ask me later", "later"),
  ready: reply("Ready", "moving"),
  notQuite: reply("Not quite", "stuck"),
  onTrack: reply("On track", "moving"),
  behind: reply("Behind", "stuck"),
  wentWell: reply("It went well", "done"),
  didntHappen: reply("It didn't happen", "paused"),
  notYet: reply("Not yet", "later"),
  pauseIt: reply("Pause it", "paused"),
  moving: reply("Moving", "moving"),
  goodProgress: reply("Good progress", "moving"),
  stuck: reply("Stuck", "stuck"),
  waiting: reply("Waiting", "waiting"),
  paused: reply("Paused", "paused"),
  allDone: reply("All done", "done"),
  workingOnIt: reply("Working on it", "moving"),
  allGood: reply("All good", "moving"),
  waitingOnThem: reply("Waiting on them", "waiting"),
  better: reply("Better", "moving"),
  notGreat: reply("Not great", "stuck"),
  notReally: reply("Not really", "stuck"),
};

/** "Yesterday" → "yesterday", "On Monday" → "Monday", for "since …". */
function since(when: string): string {
  if (when === "A while back") return "a while";
  return when.startsWith("On ") ? when.slice(3) : when.charAt(0).toLowerCase() + when.slice(1);
}

const TIER_RANK: Record<Tier, number> = {
  stuck: 0,
  waiting: 1,
  "event-past": 2,
  "event-today": 2,
  "event-soon": 3,
  habit: 4,
  stale: 5,
  step: 6,
  new: 7,
};

const STALE_KINDS = new Set(["goal", "project", "learning", "health", "other"]);

function tierOf(t: IThread, ctx: Ctx, history: History): Tier | null {
  if (t.archived || t.status === "done" || t.status === "paused") return null;
  const since = dayDiff(ctx.day, localDay(ctx.tz, t.lastTouchedAt));
  if ((t.status === "stuck" || t.status === "waiting") && since <= 14) return t.status;
  const due = dueIn(t, ctx);
  if (t.kind === "event") {
    if (due === null) return null;
    if (due < 0 && due >= -2) return "event-past";
    if (due === 0) return "event-today";
    if (due > 0 && due <= 3) return "event-soon";
    return null;
  }
  if (t.kind === "habit") return since === 0 && t.streak > 0 ? null : "habit";
  if (STALE_KINDS.has(t.kind) && since >= 7) return "stale";
  if (t.nextStep) return "step";
  if (!history.asked.has(String(t._id)) && localDay(ctx.tz, t.createdAt) < ctx.day) return "new";
  return null;
}

/** Not two days running, unless it's stuck, due, or Kata said it would ask again. */
function allowed(t: IThread, tier: Tier, history: History): boolean {
  const id = String(t._id);
  if (!history.yesterday.has(id)) return true;
  const answer = history.yesterday.get(id);
  return tier === "stuck" || tier.startsWith("event") || answer === "waiting" || answer === "stuck";
}

function time(d: Date): number {
  return new Date(d).getTime();
}

function withinTier(a: Planned, b: Planned, ctx: Ctx): number {
  const x = a.thread;
  const y = b.thread;
  switch (a.tier) {
    case "stuck":
    case "waiting":
      return time(y.lastTouchedAt) - time(x.lastTouchedAt);
    case "event-past":
    case "event-today":
    case "event-soon":
      return (dueIn(x, ctx) ?? 0) - (dueIn(y, ctx) ?? 0);
    case "habit":
      return liveStreak(y, ctx) - liveStreak(x, ctx) || x.title.localeCompare(y.title);
    case "step":
      return Number(y.kind === "task") - Number(x.kind === "task") || time(x.lastTouchedAt) - time(y.lastTouchedAt);
    case "stale":
      return time(x.lastTouchedAt) - time(y.lastTouchedAt);
    case "new":
      return time(x.createdAt) - time(y.createdAt);
  }
}

export function chooseCheckins(threads: IThread[], ctx: Ctx, history: History, max = 2): Planned[] {
  const planned = threads.flatMap((thread) => {
    const tier = tierOf(thread, ctx, history);
    return tier && allowed(thread, tier, history) ? [{ thread, tier }] : [];
  });
  const promised = (p: Planned) => {
    const answer = history.yesterday.get(String(p.thread._id));
    return answer === "stuck" || answer === "waiting" ? 0 : 1;
  };
  planned.sort(
    (a, b) => promised(a) - promised(b) || TIER_RANK[a.tier] - TIER_RANK[b.tier] || withinTier(a, b, ctx)
  );
  return planned.slice(0, max);
}

export interface Line {
  text: string;
  replies: IQuickReply[];
}

const CODEISH =
  /\b(?:pr|pull request|webhook|deploy|release|merge|feature|fix|bug|api|migration|build|branch|patch|endpoint|integration|refactor)\b/i;

function waitingReplies(t: IThread): IQuickReply[] {
  if (t.kind === "person") return [R.heardBack, R.stillWaiting, R.later];
  return CODEISH.test(t.title) ? [R.landed, R.stillWaiting, R.later] : [R.cameThrough, R.stillWaiting, R.done, R.later];
}

function waitingAsk(t: IThread, seed: number): string {
  return CODEISH.test(t.title) ? "Did it land?" : pick(["Any word?", "Any news?"], seed);
}

function stepLine(t: IThread, evening: boolean, seed: number): Line {
  const step = stepText(t.nextStep);
  const r = ref(t);
  const replies = [STEP_DONE, R.notYet, R.stuck, R.allDone];
  if (!startsWithVerb(step)) {
    return { text: `Next step on ${r}${evening ? " this morning" : ""}: ${step}. Done?`, replies };
  }
  if (evening) return { text: `This morning the next step on ${r} was to ${step}. Done?`, replies };
  return {
    text: pick(
      [`Next step on ${r} was to ${step}. Done?`, `Did you get to ${gerundPhrase(step)}? It was the next step on ${r}.`],
      seed
    ),
    replies,
  };
}

/** The morning check-in for a planned thread. */
export function checkinLine(p: Planned, ctx: Ctx, seed: number): Line {
  const t = p.thread;
  const r = ref(t);
  const R0 = capFirst(r);
  const activity = refIsActivity(t);
  const when = whenPhrase(localDay(ctx.tz, t.lastTouchedAt), ctx.day);
  const note = t.lastNote ? noteText(t.lastNote) : "";

  switch (p.tier) {
    case "stuck": {
      if (t.kind === "health") {
        const replies = [R.better, R.notReally, R.later];
        if (t.lastNote && isClause(t.lastNote) && t.lastNote.length <= 120) {
          return { text: `${when} you said ${noteText(t.lastNote)}. Any better?`, replies };
        }
        return { text: `How's ${r} been since ${since(when)}?`, replies };
      }
      const replies = [R.unstuck, R.stillStuck, R.done, R.parkIt];
      if (note && isShortPhrase(note)) {
        const options = [`${when} ${note} held up ${r}. Still the case?`];
        if (!activity) options.push(`${when} ${r} was stuck on ${note}. Any movement?`);
        return { text: pick(options, seed), replies };
      }
      if (note && isClause(note) && note.length <= 120) {
        return { text: `${when} you were stuck on ${r} because ${note.replace(/^because\s+/i, "")}. Any movement?`, replies };
      }
      if (note) return { text: `${when} you were stuck on ${r}: ${quote(t.lastNote)}. Any movement?`, replies };
      const options = [`${when} you were stuck on ${r}. Any movement?`];
      if (!activity) options.push(`Is ${r} still stuck?`);
      return { text: pick(options, seed), replies };
    }

    case "waiting": {
      const ask = waitingAsk(t, seed);
      const replies = waitingReplies(t);
      if (t.kind === "person") return { text: `${when} you were waiting on ${t.title}. ${ask}`, replies };
      if (note && isShortPhrase(note)) {
        return {
          text: activity ? `${when} you were waiting on ${note} before ${r}. ${ask}` : `${when} ${r} was waiting on ${note}. ${ask}`,
          replies,
        };
      }
      if (note) return { text: `${when} you were waiting on ${r}: ${quote(t.lastNote)}. ${ask}`, replies };
      return { text: `${when} you were waiting to hear about ${r}. ${ask}`, replies };
    }

    case "event-today":
      return {
        text: pick([`${R0} is today. All set?`, `Today's the day for ${r}. All set?`], seed),
        replies: [R.ready, R.notQuite, R.later],
      };

    case "event-soon": {
      const due = dueIn(t, ctx) ?? 1;
      const on = due === 1 ? "tomorrow" : `on ${weekdayOf(addDays(ctx.day, due))}`;
      if (t.nextStep) {
        const step = stepText(t.nextStep);
        return {
          text: startsWithVerb(step) ? `${R0} is ${on}. Did you get to ${gerundPhrase(step)}?` : `${R0} is ${on}. Next step: ${step}. Done?`,
          replies: [STEP_DONE, R.notYet, R.behind],
        };
      }
      return {
        text: pick([`${R0} is ${on}. How's the prep going?`, `${R0} is ${on}. Anything left to do?`], seed),
        replies: [R.onTrack, R.behind, R.later],
      };
    }

    case "event-past": {
      const due = dueIn(t, ctx) ?? -1;
      const was = due === -1 ? "yesterday" : `on ${weekdayOf(addDays(ctx.day, due))}`;
      return {
        text: pick([`How did ${r} go?`, `${R0} was ${was}. How did it go?`], seed),
        replies: [R.wentWell, R.didntHappen, R.later],
      };
    }

    case "habit": {
      const streak = liveStreak(t, ctx);
      const name = capFirst(t.title);
      const replies = [R.done, R.notYet, R.pauseIt];
      if (streak >= 2) {
        return {
          text: pick(
            [`${name} today? You're on ${count(streak)} days in a row.`, `${name} today? That would make ${count(streak + 1)} in a row.`],
            seed
          ),
          replies,
        };
      }
      return { text: pick([`${name} today?`, `Is there time for ${r} today?`], seed), replies };
    }

    case "stale": {
      const lastDay = localDay(ctx.tz, t.lastTouchedAt);
      const days = dayDiff(ctx.day, lastDay);
      return {
        text: pick(
          [
            `${R0} hasn't come up since ${monthDayOf(lastDay)}. Still on?`,
            `It's been ${count(days)} days since ${r} came up. Where is it now?`,
            `Haven't heard about ${r} in a while. How's it going?`,
          ],
          seed
        ),
        replies: [R.moving, R.stuck, R.paused, R.done],
      };
    }

    case "step":
      return stepLine(t, false, seed);

    case "new": {
      if (t.kind === "task") {
        return { text: pick([`Did you get to ${r}?`, `Any luck with ${r}?`], seed), replies: [R.done, R.workingOnIt, R.stuck, R.later] };
      }
      if (t.kind === "person") return { text: `Anything new with ${t.title}?`, replies: [R.allGood, R.waitingOnThem, R.later] };
      if (t.kind === "health") return { text: pick([`How's ${r}?`, `How's ${r} been?`], seed), replies: [R.better, R.notGreat, R.later] };
      return {
        text: pick([`Where are you with ${r}?`, `How's ${r} going?`, `Any progress on ${r}?`], seed),
        replies: [R.moving, R.stuck, R.waiting, R.done],
      };
    }
  }
}

/** One true sentence about where a thread stands, for when the writer asks Kata about it. */
export function threadFact(t: IThread, ctx: Ctx): string {
  const r = ref(t);
  const R0 = capFirst(r);
  const note = t.lastNote ? noteText(t.lastNote) : "";
  const inline = note && isShortPhrase(note);
  if (t.status === "stuck") return inline ? `${R0} is stuck on ${note}.` : `${R0} is marked stuck.`;
  if (t.status === "waiting") return inline ? `${R0} is waiting on ${note}.` : `${R0} is marked waiting.`;
  if (t.status === "done") return `${R0} is done.`;
  if (t.status === "paused") return `${R0} is parked.`;
  if (t.nextStep) {
    const step = stepText(t.nextStep);
    return startsWithVerb(step) ? `The next step on ${r} is to ${step}.` : `The next step on ${r} is ${step}.`;
  }
  const when = whenPhrase(localDay(ctx.tz, t.lastTouchedAt), ctx.day);
  return `${R0} last came up ${when.charAt(0).toLowerCase()}${when.slice(1)}.`;
}

/** The evening follow-up on something from this morning's conversation. */
export function eveningLine(t: IThread, morningAnswer: string | null | undefined, ctx: Ctx, seed: number): Line {
  const r = ref(t);
  const activity = refIsActivity(t);
  if (t.kind === "event" && dueIn(t, ctx) === 0) return { text: `How did ${r} go?`, replies: [R.wentWell, R.didntHappen, R.later] };
  if (t.kind === "habit") return { text: `Did ${r} happen today?`, replies: [R.done, R.notYet, R.pauseIt] };
  if (t.status === "stuck") {
    const options = [`Any movement on ${r} since this morning?`];
    if (!activity) options.push(`This morning ${r} was stuck. Any movement since?`);
    return { text: pick(options, seed), replies: [R.unstuck, R.stillStuck, R.done, R.parkIt] };
  }
  if (t.status === "waiting") return { text: `Any word on ${r} since this morning?`, replies: waitingReplies(t) };
  if (t.nextStep) return stepLine(t, true, seed);
  if (morningAnswer === undefined) {
    return { text: `You mentioned ${r} today. Where are you with it?`, replies: [R.moving, R.stuck, R.waiting, R.done] };
  }
  if (morningAnswer === null) {
    return { text: `This morning I asked about ${r}. Where did it end up?`, replies: [R.moving, R.stuck, R.waiting, R.done] };
  }
  return {
    text: pick([`How far did ${r} get today?`, `Where did ${r} end up today?`], seed),
    replies: [R.goodProgress, R.stuck, R.done, R.later],
  };
}
