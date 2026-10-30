import { CompanionMessage, type ICompanionMessage } from "@/lib/db/models/CompanionMessage";
import { questionsForToday } from "@/lib/questions/daily";
import type { DailyQuestion, KataMessage, ThreadT } from "@/lib/types";
import { contextFor, ensureToday } from "./engine";
import { toKataMessage } from "./messages";
import { listThreads, type Ctx } from "./threads";
import { addDays } from "./time";

export interface CompanionState {
  /** Today's conversation, oldest first. */
  messages: KataMessage[];
  /** Active first by priority, then recently done, then paused; at most 24. */
  threads: ThreadT[];
  mood: {
    today: number | null;
    /** The last seven local days, oldest first; today is last. */
    week: (number | null)[];
  };
  questions: DailyQuestion[];
  /** The writer's local day, yyyy-mm-dd. */
  today: string;
}

async function moodSummary(ctx: Ctx): Promise<CompanionState["mood"]> {
  const days = Array.from({ length: 7 }, (_, i) => addDays(ctx.day, i - 6));
  const answers = await CompanionMessage.find({ userId: ctx.userId, from: "you", mood: { $ne: null }, day: { $in: days } })
    .sort({ createdAt: 1 })
    .select("day mood")
    .lean<Pick<ICompanionMessage, "day" | "mood">[]>();
  // Sorted oldest first, so the day's latest answer wins.
  const byDay = new Map(answers.map((a) => [a.day, a.mood]));
  const week = days.map((d) => byDay.get(d) ?? null);
  return { today: week[6], week };
}

/** Everything the companion needs on first paint, already serialised. Writes today's messages if they're due. */
export async function loadCompanion(userId: string): Promise<CompanionState> {
  const { ctx, messages } = await ensureToday(userId);
  const [threads, mood] = await Promise.all([listThreads(ctx), moodSummary(ctx)]);
  return {
    messages: messages.map(toKataMessage),
    threads,
    mood,
    questions: questionsForToday(ctx.user, threads, ctx.day),
    today: ctx.day,
  };
}

export async function questionsFor(userId: string): Promise<DailyQuestion[]> {
  const ctx = await contextFor(userId);
  return questionsForToday(ctx.user, await listThreads(ctx), ctx.day);
}
