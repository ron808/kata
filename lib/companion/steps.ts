import type { ThreadKind, ThreadStatus, ThreadT } from "@/lib/types";
import { localDay } from "./time";

/*
 * Where a thread stands, as the writer can set it: one list for every place a thread is shown
 * (the map's card, the Threads page, the conversation), so a thread looks and works the same
 * everywhere. Client-safe: the server checks taps against the same steps.
 */

export interface Step {
  value: ThreadStatus;
  label: string;
}

/** What someone can say about a thread. A habit is done today or it isn't, and a person is never done. */
export function stepsFor(kind: ThreadKind, { paused = true }: { paused?: boolean } = {}): Step[] {
  if (kind === "habit") {
    return [
      { value: "moving", label: "Going" },
      { value: "done", label: "Done today" },
      { value: "paused", label: "Paused" },
    ];
  }
  if (kind === "person") {
    return [
      { value: "moving", label: "All good" },
      { value: "waiting", label: "Waiting" },
      { value: "paused", label: "Paused" },
    ];
  }
  const steps: Step[] = [
    { value: "moving", label: "Moving" },
    { value: "stuck", label: "Stuck" },
    { value: "waiting", label: "Waiting" },
    { value: "done", label: "Done" },
  ];
  return paused ? [...steps, { value: "paused", label: "Paused" }] : steps;
}

/** A habit was done today: its last touch is the last day it was done. */
export const doneToday = (t: Pick<ThreadT, "streak" | "lastTouchedAt">, today: string, tz: string) => t.streak > 0 && localDay(tz, new Date(t.lastTouchedAt)) === today;

/** Which step it's on now. */
export function stepOn(t: Pick<ThreadT, "kind" | "status" | "streak" | "lastTouchedAt">, step: ThreadStatus, today: string, tz: string): boolean {
  if (t.kind !== "habit" || t.status === "paused") return t.status === step;
  return step === "done" ? doneToday(t, today, tz) : step === "moving" && !doneToday(t, today, tz);
}

/** The step it's on now. */
export function currentStep(t: Pick<ThreadT, "kind" | "status" | "streak" | "lastTouchedAt">, today: string, tz: string): ThreadStatus {
  return stepsFor(t.kind).find((s) => stepOn(t, s.value, today, tz))?.value ?? t.status;
}

/**
 * What setting a step did, in a few words: the line that says so in the conversation and the
 * toast on a card. "Finish scrapers is done", "Drink water: done today", "Waiting on Sam".
 */
export function stepSaid(t: Pick<ThreadT, "title" | "kind">, step: ThreadStatus): string {
  const { title, kind } = t;
  if (step === "paused") return `${title} is paused`;
  if (kind === "habit") return step === "done" ? `${title}: done today` : `${title}: not done today`;
  if (kind === "person") return step === "waiting" ? `Waiting on ${title}` : `${title}: all good`;
  if (kind === "health" && step === "moving") return `${title}: better`;
  if (kind === "health" && step === "stuck") return `${title}: not great`;
  return `${title} is ${step}`;
}

/** The five steps of a mood, everywhere one is asked. */
export const MOOD_STEPS = [
  { value: 1, label: "Foggy" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Bright" },
] as const;
