import { nanoid } from "nanoid";
import { MISSION_LOG_MAX, TASKS_MAX, type IMission, type IMissionTask } from "@/lib/db/models/Mission";
import { isOpen, lasted, spentOn, tally } from "./core";
import type { ParsedTask } from "./parse";

/**
 * Everything that can happen to a mission, as a pure step from one state to the next, so the
 * page, Maru and the tests all go through the same rules. Timers are stored as "time so far"
 * plus "running since", so nothing has to tick on the server and a closed tab loses nothing.
 */

export type Change =
  | { do: "start"; task: string }
  | { do: "pause" }
  | { do: "done"; task: string; note?: string }
  | { do: "skip"; task: string }
  /** Back on the list, after done, skipped or stuck. */
  | { do: "back"; task: string }
  | { do: "stuck"; task: string; note?: string }
  /** Where it stands, in their words. */
  | { do: "note"; task: string; note: string }
  /** "Still on it": an answer, so Maru leaves them to it. */
  | { do: "still" }
  | { do: "add"; tasks: ParsedTask[] }
  | { do: "edit"; task: string; title?: string; at?: Date | null; minutes?: number | null }
  | { do: "more"; task: string; minutes: number }
  | { do: "remove"; task: string }
  | { do: "rename"; title: string }
  | { do: "ends"; endsAt: Date | null }
  | { do: "focus" }
  | { do: "unfocus" }
  | { do: "finish" }
  | { do: "drop" }
  | { do: "reopen" }
  /** A day's list that's still going, moved on to today. */
  | { do: "carry"; day: string };

export type Patch = Pick<IMission, "tasks" | "log" | "focusMs" | "focusedAt" | "askedAt" | "status" | "endsAt" | "endedAt" | "title" | "day">;

export class NoSuchTask extends Error {}
export class Finished extends Error {}

const HUES = 8;

/** A copy without some optional fields: nothing a task doesn't use gets stored. */
function without(t: IMissionTask, ...keys: ("startedAt" | "doneAt" | "at" | "minutes")[]): IMissionTask {
  const copy = { ...t };
  for (const key of keys) delete copy[key];
  return copy;
}

/** Time on a task banked, its timer stopped. */
function stopped(t: IMissionTask, now: Date): IMissionTask {
  return t.startedAt ? { ...without(t, "startedAt"), spentMs: spentOn(t, now.getTime()) } : t;
}

const stopAll = (tasks: IMissionTask[], now: Date) => tasks.map((t) => stopped(t, now));

export function newTask(t: ParsedTask, hue: number): IMissionTask {
  return {
    id: nanoid(6),
    title: t.title.slice(0, 120),
    status: "todo",
    hue: hue % HUES,
    spentMs: 0,
    ...(t.at ? { at: t.at } : {}),
    ...(t.minutes ? { minutes: t.minutes } : {}),
  };
}

const said = (t: IMissionTask, now: Date) => {
  const spent = spentOn(t, now.getTime());
  return spent >= 60_000 ? ` · ${lasted(spent)}` : "";
};

/** The mission after a change. Throws when the task isn't there, or the mission has ended. */
export function apply(m: Patch, c: Change, now: Date): Patch {
  if (m.status !== "open" && c.do !== "reopen") throw new Finished();
  const next: Patch = { ...m, tasks: m.tasks, log: m.log };
  const lines: string[] = [];
  const task = "task" in c ? m.tasks.find((t) => t.id === c.task) : undefined;
  if ("task" in c && !task) throw new NoSuchTask();
  const set = (id: string, change: (t: IMissionTask) => IMissionTask) => {
    next.tasks = next.tasks.map((t) => (t.id === id ? change(t) : t));
  };
  // An answer about where things stand, whichever way it came: Maru can leave them be for a while.
  const answered = () => {
    next.askedAt = now;
  };

  switch (c.do) {
    case "start": {
      const t = task as IMissionTask;
      next.tasks = stopAll(next.tasks, now);
      set(t.id, (x) => ({ ...without(x, "doneAt"), status: "todo", startedAt: now }));
      answered();
      lines.push(`Started ${t.title}`);
      break;
    }
    case "pause": {
      const running = next.tasks.find((t) => t.startedAt);
      if (!running) return next;
      next.tasks = stopAll(next.tasks, now);
      answered();
      lines.push(`Paused ${running.title}${said(running, now)}`);
      break;
    }
    case "done": {
      const t = task as IMissionTask;
      set(t.id, (x) => ({ ...stopped(x, now), status: "done", doneAt: now, ...(c.note ? { note: c.note.slice(0, 200) } : {}) }));
      answered();
      lines.push(`Done: ${t.title}${said(t, now)}`);
      break;
    }
    case "skip": {
      const t = task as IMissionTask;
      set(t.id, (x) => ({ ...stopped(x, now), status: "skipped" }));
      answered();
      lines.push(`Skipped ${t.title}`);
      break;
    }
    case "back": {
      const t = task as IMissionTask;
      set(t.id, (x) => ({ ...without(stopped(x, now), "doneAt"), status: "todo" }));
      lines.push(`Back on the list: ${t.title}`);
      break;
    }
    case "stuck": {
      const t = task as IMissionTask;
      set(t.id, (x) => ({ ...stopped(x, now), status: "stuck", ...(c.note ? { note: c.note.slice(0, 200) } : {}) }));
      answered();
      lines.push(`Stuck on ${t.title}${c.note ? `: ${c.note}` : ""}`);
      break;
    }
    case "note": {
      const t = task as IMissionTask;
      set(t.id, (x) => ({ ...x, note: c.note.slice(0, 200) }));
      answered();
      lines.push(`${t.title}: ${c.note}`);
      break;
    }
    case "still":
      answered();
      break;
    case "add": {
      const room = TASKS_MAX - next.tasks.length;
      const added = c.tasks.slice(0, Math.max(0, room)).map((t, i) => newTask(t, next.tasks.length + i));
      next.tasks = [...next.tasks, ...added];
      if (added.length) lines.push(`Added ${added.map((t) => t.title).join(", ")}`);
      break;
    }
    case "edit": {
      const t = task as IMissionTask;
      set(t.id, (x) => {
        const at = c.at === undefined ? x.at : (c.at ?? undefined);
        const minutes = c.minutes === undefined ? x.minutes : (c.minutes ?? undefined);
        return { ...without(x, "at", "minutes"), ...(c.title ? { title: c.title.slice(0, 120) } : {}), ...(at ? { at } : {}), ...(minutes ? { minutes } : {}) };
      });
      break;
    }
    case "more": {
      const t = task as IMissionTask;
      // Time on the clock now, however much of the old timer was used.
      const base = Math.ceil(spentOn(t, now.getTime()) / 60_000);
      set(t.id, (x) => ({ ...x, minutes: Math.max(x.minutes ?? 0, base) + c.minutes }));
      answered();
      lines.push(`${c.minutes} more minutes on ${t.title}`);
      break;
    }
    case "remove": {
      const t = task as IMissionTask;
      next.tasks = next.tasks.filter((x) => x.id !== t.id);
      lines.push(`Took off ${t.title}`);
      break;
    }
    case "rename":
      next.title = c.title.slice(0, 80);
      break;
    case "ends":
      next.endsAt = c.endsAt;
      answered();
      break;
    case "focus":
      if (m.focusedAt) return next;
      next.focusedAt = now;
      answered();
      lines.push("Focus on");
      break;
    case "unfocus": {
      if (!m.focusedAt) return next;
      next.tasks = stopAll(next.tasks, now);
      const stretch = now.getTime() - new Date(m.focusedAt).getTime();
      next.focusMs = m.focusMs + Math.max(0, stretch);
      next.focusedAt = null;
      lines.push(`Focus off · ${lasted(stretch)}`);
      break;
    }
    case "finish":
    case "drop": {
      const out = m.focusedAt ? apply(m, { do: "unfocus" }, now) : m;
      next.tasks = stopAll(out.tasks, now);
      next.log = out.log;
      next.focusMs = out.focusMs;
      next.focusedAt = null;
      next.status = c.do === "finish" ? "done" : "dropped";
      next.endedAt = now;
      const { done, total } = tally(next.tasks);
      lines.push(`${c.do === "finish" ? "Wrapped up" : "Dropped it"}: ${done} of ${total} done`);
      break;
    }
    case "reopen":
      next.status = "open";
      next.endedAt = null;
      lines.push("Opened again");
      break;
    case "carry":
      next.day = c.day;
      // Yesterday's clock times mean nothing today.
      next.tasks = next.tasks.map((t) => (isOpen(t) ? without(t, "at") : t));
      lines.push(`Carried over to ${c.day}`);
      break;
  }
  if (lines.length) next.log = [...next.log, ...lines.map((text) => ({ at: now, text: text.slice(0, 240) }))].slice(-MISSION_LOG_MAX);
  return next;
}

// A focus nobody has touched in this long was left on: nobody works through the night by a timer.
export const LEFT_ON_MS = 6 * 3_600_000;

/**
 * A focus left on (they closed the laptop and went to bed): the clocks stop at the last thing
 * that happened, so the night doesn't count as work.
 */
export function leftOn(m: Pick<IMission, "focusedAt" | "updatedAt" | "askedAt">, now: Date): Date | null {
  if (!m.focusedAt) return null;
  const last = new Date(m.updatedAt);
  return now.getTime() - last.getTime() >= LEFT_ON_MS ? last : null;
}
