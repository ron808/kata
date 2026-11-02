import { capFirst, ref } from "@/lib/companion/text";
import type { TaskStatus } from "@/lib/types";

/**
 * What a mission's numbers mean, safe on the server and in the browser. Times come as Dates
 * there and strings here, so everything reads them through `ms`.
 */

type When = Date | string | null | undefined;

const ms = (at: When) => (at ? new Date(at).getTime() : 0);

interface Timed {
  status: TaskStatus;
  at?: When;
  minutes?: number | null;
  spentMs: number;
  startedAt?: When;
}

/** Time on a task so far, the stretch running now included. */
export function spentOn(t: Pick<Timed, "spentMs" | "startedAt">, now: number): number {
  return t.spentMs + (t.startedAt ? Math.max(0, now - ms(t.startedAt)) : 0);
}

/** Time in focus so far, the stretch running now included. */
export function focusedFor(m: { focusMs: number; focusedAt?: When }, now: number): number {
  return m.focusMs + (m.focusedAt ? Math.max(0, now - ms(m.focusedAt)) : 0);
}

/** How much of a task's timer is left. Null when it has none, and below zero once it's over. */
export function leftOn(t: Pick<Timed, "spentMs" | "startedAt" | "minutes">, now: number): number | null {
  return t.minutes ? t.minutes * 60_000 - spentOn(t, now) : null;
}

const OPEN: TaskStatus[] = ["todo", "stuck"];
export const isOpen = (t: Pick<Timed, "status">) => OPEN.includes(t.status);

export function tally(tasks: Pick<Timed, "status">[]) {
  const done = tasks.filter((t) => t.status === "done").length;
  const skipped = tasks.filter((t) => t.status === "skipped").length;
  return { done, skipped, left: tasks.length - done - skipped, total: tasks.length };
}

const DUE_SOON = 5 * 60_000;

/**
 * What's up now: the one running, then whatever's time has come, then the rest in list order,
 * then anything planned for later, with stuck ones last. That's what focus shows, and what
 * "what's next" answers.
 */
export function nextUp<T extends Timed>(tasks: T[], now: number): T | null {
  const running = tasks.find((t) => t.startedAt);
  if (running) return running;
  const todo = tasks.filter((t) => t.status === "todo");
  const byTime = (a: T, b: T) => ms(a.at) - ms(b.at);
  const due = todo.filter((t) => t.at && ms(t.at) <= now + DUE_SOON).sort(byTime);
  const any = todo.filter((t) => !t.at);
  const later = todo.filter((t) => t.at && ms(t.at) > now + DUE_SOON).sort(byTime);
  return due[0] ?? any[0] ?? later[0] ?? tasks.find((t) => t.status === "stuck") ?? null;
}

/** "1:02:03", or "12:03" under an hour. */
export function clock(milliseconds: number): string {
  const total = Math.max(0, Math.floor(Math.abs(milliseconds) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "1h 12m", "12 min", "under a minute". */
export function lasted(milliseconds: number): string {
  if (milliseconds < 60_000) return "under a minute";
  const minutes = Math.round(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** The task in the middle of a sentence: “Tax form”, the gym, filing your taxes. */
export const taskRef = (title: string) => ref({ title, kind: "task" });

const DAY_NAME = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
const DATE_NAME = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/** What a mission is called: its own name, or from the day it's for, as seen from today. */
export function missionName(m: { title: string; day: string }, today: string): string {
  if (m.title) return capFirst(m.title);
  const d = daysBetween(m.day, today);
  if (d === 0) return "Today’s list";
  if (d === 1) return "Tomorrow’s list";
  if (d === -1) return "Yesterday’s list";
  return Math.abs(d) < 7 ? `${DAY_NAME(m.day)}’s list` : `The list for ${DATE_NAME(m.day)}`;
}
