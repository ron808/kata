"use client";

import { stepOn, stepsFor } from "@/lib/companion/steps";
import type { ThreadStatus, ThreadT } from "@/lib/types";

/**
 * Where a thread stands, as one row of steps: the same control on its card on home, on the
 * Threads page and in the conversation, so a thread is set the same way everywhere. The step it's
 * on is pressed; tapping another one sets it (a habit's "Done today" counts today, "Going" takes
 * it back). Pressing the one it's on does nothing.
 */
export function ThreadSteps({
  thread: t,
  today,
  tz,
  onStep,
  disabled = false,
  paused = true,
  pending = null,
}: {
  thread: Pick<ThreadT, "title" | "kind" | "status" | "streak" | "lastTouchedAt">;
  today: string;
  tz: string;
  onStep: (step: ThreadStatus) => void;
  disabled?: boolean;
  /** Offer Paused on a project or a task too (habits and people always have it). */
  paused?: boolean;
  /** A step on its way to the server, pressed until the answer comes back. */
  pending?: ThreadStatus | null;
}) {
  const steps = stepsFor(t.kind, { paused: paused || t.kind === "habit" || t.kind === "person" || t.status === "paused" });
  return (
    <div className="scale" role="group" aria-label={`Where ${t.title} is`}>
      {steps.map((s) => {
        const on = pending ? pending === s.value : stepOn(t, s.value, today, tz);
        return (
          <button
            key={s.value}
            type="button"
            className="scale-step scale-row"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => !on && onStep(s.value)}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
