import type { MissionT, TaskT } from "@/lib/types";
import { focusedFor, isOpen, lasted, spentOn, tally } from "./core";

/**
 * What a mission came to, worked out in code from what happened on it. No model decides any of
 * it, so a report always says the same thing about the same mission.
 */

export interface Report {
  done: number;
  total: number;
  skipped: number;
  left: TaskT[];
  /** What each finished task took, the longest first, with its share of the longest. */
  time: { task: TaskT; ms: number; share: number; over: boolean }[];
  focusedMs: number;
  /** "3 of 5 done · 2h 10m in focus" */
  line: string;
}

export function reportOf(m: MissionT, now = Date.parse(m.now)): Report {
  const { done, total, skipped } = tally(m.tasks);
  const focusedMs = focusedFor(m, now);
  const spent = m.tasks.map((task) => ({ task, ms: spentOn(task, now) })).filter((t) => t.ms >= 60_000).sort((a, b) => b.ms - a.ms);
  const longest = spent[0]?.ms ?? 1;
  const line = [`${done} of ${total} done`, focusedMs >= 60_000 ? `${lasted(focusedMs)} in focus` : ""].filter(Boolean).join(" · ");
  return {
    done,
    total,
    skipped,
    left: m.tasks.filter(isOpen),
    time: spent.map((t) => ({ ...t, share: t.ms / longest, over: Boolean(t.task.minutes && t.ms > t.task.minutes * 60_000 * 1.1) })),
    focusedMs,
    line,
  };
}
