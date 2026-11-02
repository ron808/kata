import type { QuestionTag } from "@/lib/questions/bank";
import type { RoleKey, ThreadStatus } from "@/lib/types";
import { capFirst, count, joinList, pick } from "./text";
import { dayDiff, monthDayOf, weekdayOf } from "./time";

/**
 * Everything Kata says that isn't a check-in. Short, plain, sentence case, no
 * exclamation marks, and only facts Kata actually has.
 */

export function salutation(hour: number, first: string, seed: number): string {
  const name = first ? `, ${first}` : "";
  if (hour >= 5 && hour < 12) return pick([`Morning${name}.`, `Good morning${name}.`], seed);
  if (hour >= 12 && hour < 17) return pick([`Afternoon${name}.`, `Hi${name}.`], seed);
  if (hour >= 17 && hour < 22) return pick([`Evening${name}.`, `Good evening${name}.`], seed);
  return pick([`Hi${name}.`, `Hello${name}.`], seed);
}

/** From five, until the day turns at 4am. */
export function isEvening(hour: number): boolean {
  return hour >= 17 || hour < 4;
}

export interface GreetingFacts {
  /** Consecutive days with a page, counted the way the dashboard counts them. */
  streak: number;
  wroteToday: boolean;
  /** Threads yesterday's page was about, already named for a sentence. */
  yesterdayTopics: string[];
  yesterdayWords: number | null;
  /** The writer's local day of their most recent page. */
  lastPageDay: string | null;
  pages: number;
}

/** One true line of context: yesterday's page, the streak, the gap, or just the date. */
export function contextLine(facts: GreetingFacts, day: string, seed: number): string {
  const lines: string[] = [];
  if (facts.yesterdayTopics.length) {
    const topics = joinList(facts.yesterdayTopics.slice(0, 2));
    lines.push(pick([`Yesterday's page was about ${topics}.`, `Yesterday you wrote about ${topics}.`], seed));
  }
  if (facts.streak >= 3) {
    const n = count(facts.streak);
    lines.push(
      facts.wroteToday
        ? `${capFirst(n)} days in a row, today included.`
        : pick([`${capFirst(n)} days in a row so far.`, `You've written ${n} days running.`], seed)
    );
  }
  if (facts.lastPageDay) {
    const gap = dayDiff(day, facts.lastPageDay);
    if (gap >= 2) lines.push(`Your last page was on ${gap < 7 ? weekdayOf(facts.lastPageDay) : monthDayOf(facts.lastPageDay)}.`);
  }
  if (facts.pages === 0) lines.push("Your first page is ready when you are.");
  if (facts.yesterdayWords && !facts.yesterdayTopics.length) {
    lines.push(`Yesterday's page ran to ${facts.yesterdayWords} word${facts.yesterdayWords === 1 ? "" : "s"}.`);
  }
  if (facts.streak === 2) lines.push(facts.wroteToday ? "Two days in a row, today included." : "Two days in a row so far.");
  // The date only when there's nothing more personal that's true.
  return lines.length ? pick(lines.slice(0, 2), seed >>> 3) : `It's ${weekdayOf(day)}, ${monthDayOf(day)}.`;
}

export function moodQuestion(hour: number, seed: number): string {
  if (isEvening(hour)) return pick(["How did today go?", "How was today?"], seed);
  if (hour >= 12) return pick(["How's the day going?", "How are you doing today?"], seed);
  return pick(["How are you this morning?", "How are you feeling today?", "How are you today?"], seed);
}

const MOOD_DAY: Record<number, string[]> = {
  1: ["Foggy, then. Pick one small thing and let the rest wait.", "Noted. On a foggy day, one small thing is plenty."],
  2: ["Sorry it's a low one. Keep the list short today.", "Noted. Go easy on the plan today."],
  3: ["Okay is a fine place to start.", "Noted. Let's see where the day goes."],
  4: ["Good. Spend it on the thing that matters most.", "Glad to hear it."],
  5: ["Good to hear. Point it at something hard.", "Bright it is. Make the most of it."],
};

const MOOD_EVENING: Record<number, string[]> = {
  1: ["Sounds like a foggy one. Rest will do more than a plan tonight.", "Noted. Tomorrow is a new page."],
  2: ["Sorry it was a low one. Thanks for saying so.", "Noted. Tomorrow can be smaller."],
  3: ["Noted. Not every day has to be a big one.", "An okay day still counts."],
  4: ["Good. Worth writing down what went right.", "Glad it was a good one."],
  5: ["Good to hear. Write down what made it work.", "A bright one. Worth a line on today's page."],
};

export function moodReply(mood: number, evening: boolean, seed: number): string {
  return pick((evening ? MOOD_EVENING : MOOD_DAY)[mood] ?? ["Noted."], seed);
}

const OPEN_BY_ROLE: Record<RoleKey, string[]> = {
  developer: ["What are you building this week?", "What's on your plate this week?"],
  designer: ["What are you designing this week?", "What's on your plate this week?"],
  founder: ["What has to happen this week?", "What's on your plate this week?"],
  freelancer: ["Which clients are you working with this week?", "What's on your plate this week?"],
  teacher: ["What are you teaching this week?", "What's on your plate this week?"],
  healthcare: ["What does work look like in the next few days?", "What's on your plate this week?"],
  shift_worker: ["When's your next shift?", "What's on your plate between shifts?"],
  creative: ["What are you making at the moment?", "What's on your plate this week?"],
  job_seeker: ["Which applications are you working on this week?", "What's on your plate this week?"],
  student: ["What are you studying this week?", "What's due this week?"],
  parent: ["Who are you looking after this week, and what's coming up?", "What's on your plate this week?"],
  athlete: ["What are you training for?", "What does your training look like this week?"],
  wellbeing: ["What would make this week a little easier?", "What small habit would you like to keep?"],
  retired: ["What are you enjoying at the moment?", "What's on this week?"],
  custom: ["What's on your plate this week?", "What are you working on at the moment?"],
};

const OPEN_BY_INTEREST: Partial<Record<QuestionTag, string>> = {
  fitness: "What are you training for at the moment?",
  writing: "What are you writing at the moment?",
  learning: "What are you learning at the moment?",
  study: "What are you studying this week?",
  "job-hunt": "Which applications are you working on this week?",
  shipping: "What are you trying to ship this week?",
  creativity: "What are you making at the moment?",
  design: "What are you designing this week?",
  reading: "What are you reading at the moment?",
  music: "What are you playing or listening to at the moment?",
  travel: "Where are you hoping to go next?",
  nature: "What's growing, or where are you walking, at the moment?",
};

/** When Kata has no threads yet: one open question from the writer's role or interests. */
export function openQuestion(role: RoleKey, interests: QuestionTag[], seed: number): string {
  const options = [...OPEN_BY_ROLE[role], ...interests.flatMap((i) => OPEN_BY_INTEREST[i] ?? [])];
  return pick(Array.from(new Set(options)), seed);
}

// ── After a reply ────────────────────────────────────────────────────────────

export const followUp = {
  done: (r: string, seed: number) =>
    pick([`Nice work on ${r}. What's next?`, `That's ${r} done. What's next?`, "Good. One less thing. What's next?"], seed),
  doneShare: (r: string, seed: number) =>
    pick([`Nice work on ${r}. Share it on your profile?`, `That's ${r} done. Want to share it on your profile?`], seed),
  shared: "Shared on your profile. What's next?",
  kept: "Kept here. What's next?",
  habit: (streak: number, first: boolean, seed: number, rests = false) =>
    streak <= 1
      ? first
        ? "Done. That's day one."
        : "Done."
      : pick([`Done. That's ${count(streak)}${rests ? "" : " days"} in a row.`, `Good. ${capFirst(count(streak))} in a row now.`], seed),
  wentWell: "Glad it went well. What's next?",
  rough: "Sorry it was rough. It's off your list now.",
  eventDone: "Noted. What's next?",
  stepDone: (r: string) => `Good. What's the next step on ${r}?`,
  eventSoon: (weekday: string) => `Good. I'll check back before ${weekday}.`,
  prepDone: (when: string) => (when === "today" ? "Good. One less thing before it starts." : `Good. One less thing before ${when}.`),
  allSet: "Good. You're all set, then.",
  eventToday: "Good luck with it. I'll ask how it went.",
  moving: (r: string, seed: number) => pick(["Good. What's the next step?", `What's the next step on ${r}?`], seed),
  stuck: (knownBlocker: boolean) => (knownBlocker ? "What's in the way now?" : "What's in the way?"),
  healthStuck: "Sorry to hear it. What would help?",
  better: "Good to hear.",
  nextStepOnIt: "What's the next step on it?",
  waiting: "On whom? I'll ask again tomorrow.",
  waitingKnown: "Okay. I'll ask again tomorrow.",
  paused: "Parked. I'll stop asking about it.",
  later: (seed: number) => pick(["Okay. I'll ask another day.", "Sure, another day."], seed),
  notYet: "Okay. No rush.",
  gone: "That one isn't on your list any more.",
};

// ── After free text ──────────────────────────────────────────────────────────

export const ack = {
  blocker: (r: string) => `Noted. I'll ask about ${r} tomorrow.`,
  whom: (whom: string) => `Got it: waiting on ${whom}.`,
  whomLong: "Got it. I'll ask again tomorrow.",
  step: (r: string, step: string) => `Noted. Next step on ${r}: ${step}.`,
  tracking: (list: string, seed: number) =>
    pick([`I'll keep track of ${list}.`, `Noted. I'm keeping track of ${list} now.`], seed),
  added: (list: string) => `Added to ${list}.`,
  noRush: "No rush. Tell me when you know.",
  onThreads: "I can't change that right now. You can on the Threads page.",
  noted: (seed: number) => pick(["Noted.", "Got it.", "Thanks, noted."], seed),
  heavy: (seed: number) => pick(["That sounds like a lot. Keep today small if you can.", "Noted. Go easy on yourself today."], seed),
  glad: "Good to hear.",
  thanks: "Any time.",
  cantAnswer: "I can't answer that one. I'm better at keeping track of what you're working on.",
  noAnswer: (fact: string) => `I don't have an answer to that. ${fact}`,
  hello: (first: string) => `Hi${first ? `, ${first}` : ""}.`,
};

const STATUS_WORDS: Record<ThreadStatus, string> = {
  moving: "moving again",
  stuck: "stuck",
  waiting: "waiting",
  paused: "parked",
  done: "done",
};

/** "The payments webhook is waiting on review from Priya." The note is used only when it reads inline. */
export function statusLine(r: string, status: ThreadStatus, note: string): string {
  if (note && (status === "waiting" || status === "stuck")) return `${capFirst(r)} is ${status} on ${note}.`;
  return `${capFirst(r)} is ${STATUS_WORDS[status]}.`;
}
