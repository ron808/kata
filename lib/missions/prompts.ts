import { lasted, leftOn, nextUp, spentOn, taskRef, tally } from "./core";
import type { MissionT, TaskT } from "@/lib/types";

/**
 * What Maru asks in focus, worked out on the page from the clock: no model and nothing stored
 * until there's an answer. It only ever asks about what they're doing, and only while Kata is
 * open: nothing is sent anywhere.
 */

export type PromptAnswer =
  | { label: string; do: "done" | "skip" | "start"; task: string }
  | { label: string; do: "more"; task: string; minutes: number }
  | { label: string; do: "later"; task: string }
  | { label: string; do: "stuck"; task: string }
  | { label: string; do: "still" | "wrap" | "add" }
  | { label: string; do: "extend"; minutes: number };

export interface Prompt {
  /** Which question this is, so the same one isn't asked twice over. */
  key: string;
  text: string;
  answers: PromptAnswer[];
  /** Worth a sound: a timer ran out, or a time came. */
  ring: boolean;
}

const CHECK_EVERY = 25 * 60_000;
const IDLE_AFTER = 10 * 60_000;
// A planned time still counts as "now" for this long.
const STILL_DUE = 30 * 60_000;

const ms = (at: string | null) => (at ? Date.parse(at) : 0);

export function promptFor(m: MissionT, now: number): Prompt | null {
  const asked = ms(m.askedAt);
  const running = m.tasks.find((t) => t.startedAt);
  const { left } = tally(m.tasks);
  const ends = ms(m.endsAt);

  if (ends && now >= ends && left > 0 && asked < ends) {
    return {
      key: `ends-${ends}`,
      text: `Time’s up. ${left === 1 ? "One thing left" : `${left} things left`}.`,
      answers: [
        { label: "Wrap it up", do: "wrap" },
        { label: "30 more minutes", do: "extend", minutes: 30 },
      ],
      ring: true,
    };
  }
  if (m.tasks.length && !left) {
    return { key: "all-done", text: "That’s everything on the list.", answers: [{ label: "Wrap it up", do: "wrap" }, { label: "Add something", do: "add" }], ring: false };
  }
  if (running) {
    const over = leftOn(running, now);
    if (over !== null && over <= 0 && asked < ms(running.startedAt) + (running.minutes ?? 0) * 60_000 - running.spentMs) {
      return {
        key: `over-${running.id}-${running.minutes}`,
        text: `Time’s up on ${taskRef(running.title)}. Where are we?`,
        answers: [
          { label: "Done", do: "done", task: running.id },
          { label: "15 more minutes", do: "more", task: running.id, minutes: 15 },
          { label: "Stuck", do: "stuck", task: running.id },
        ],
        ring: true,
      };
    }
  }
  const due = dueNow(m.tasks, now, running);
  if (due && asked < ms(due.at)) {
    return {
      key: `due-${due.id}-${due.at}`,
      text: running ? `It’s time for ${taskRef(due.title)}. Switch to it?` : `It’s time for ${taskRef(due.title)}.`,
      answers: [
        { label: running ? "Switch" : "Start it", do: "start", task: due.id },
        { label: "In 30 minutes", do: "later", task: due.id },
        { label: "Skip it", do: "skip", task: due.id },
      ],
      ring: true,
    };
  }
  if (running && now - Math.max(asked, ms(running.startedAt)) >= CHECK_EVERY) {
    return {
      key: `check-${running.id}-${Math.floor(now / CHECK_EVERY)}`,
      text: `Where are we on ${taskRef(running.title)}?`,
      answers: [
        { label: "Still on it", do: "still" },
        { label: "Done", do: "done", task: running.id },
        { label: "Stuck", do: "stuck", task: running.id },
      ],
      ring: false,
    };
  }
  const up = nextUp(m.tasks, now);
  if (!running && up && up.status === "todo" && now - Math.max(asked, ms(m.focusedAt)) >= IDLE_AFTER && !(up.at && ms(up.at) > now)) {
    return {
      key: `idle-${up.id}-${Math.floor(now / IDLE_AFTER)}`,
      text: `What’s next? ${spentOn(up, now) ? "Back to" : "How about"} ${taskRef(up.title)}?`,
      answers: [
        { label: "Start it", do: "start", task: up.id },
        { label: "Taking a break", do: "still" },
      ],
      ring: false,
    };
  }
  return null;
}

/** The task whose planned time has just come, if any. */
function dueNow(tasks: TaskT[], now: number, running: TaskT | undefined): TaskT | null {
  const due = tasks.filter((t) => t.status === "todo" && t.at && t !== running && ms(t.at) <= now && now - ms(t.at) < STILL_DUE);
  return due.sort((a, b) => ms(b.at) - ms(a.at))[0] ?? null;
}

/** "Hi. 2 of 5 done, and the tax form's next." What the mission says about itself, for a greeting or "where are we". */
export function whereWeAre(m: Pick<MissionT, "tasks" | "endsAt" | "endsText">, now: number): string {
  const { done, total, left } = tally(m.tasks);
  if (!total) return "Nothing on the list yet.";
  const up = nextUp(m.tasks, now);
  const parts = [`${done} of ${total} done.`];
  if (up?.startedAt) {
    const timer = leftOn(up, now);
    parts.push(`On ${taskRef(up.title)}${timer !== null && timer > 0 ? `, ${lasted(timer)} left on it` : ""}.`);
  } else if (up) parts.push(`${capitalise(taskRef(up.title))} ${up.atText ? `at ${up.atText}` : ""} is next.`.replace(/\s+is/, " is"));
  else if (!left) parts.push("That’s everything.");
  const ends = ms(m.endsAt);
  if (ends) parts.push(ends > now ? `${lasted(ends - now)} left.` : "Time’s up.");
  return parts.join(" ");
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

