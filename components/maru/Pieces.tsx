"use client";

import Link from "next/link";
import { Icon } from "@/components/shared/Icon";
import { metaWithToday } from "@/components/home/meta";
import { doneToday, stepsFor } from "@/lib/companion/steps";
import type { KataMessage, ThreadStatus, ThreadT } from "@/lib/types";
import { ThreadSteps } from "./ThreadSteps";

/*
 * Threads in the conversation, drawn from the threads as they are now, not as they were when
 * Maru asked: a piece never offers what's already settled. Only the newest piece on a thread
 * can be tapped; an older one shows where the thread is now. Colour is the thread's own hue,
 * the same as its sticker on the map.
 */

/** A thread's name and where it is, as on its sticker: the top of every thread piece. */
export function ThreadHead({ thread: t, today, tz }: { thread: ThreadT; today: string; tz: string }) {
  return (
    // The name wins the room: where it and the meta don't both fit, the meta drops to a line of its own.
    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
      <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-edge bg-hue" />
      <Link href={`/threads?t=${t._id}`} className="min-w-0 max-w-[calc(100%-1.5rem)] truncate font-display text-[1.15rem] leading-tight hover:underline">
        {t.title}
      </Link>
      <span className="ml-auto text-[0.8125rem] font-semibold">{metaWithToday(t, today, tz, { due: true })}</span>
    </div>
  );
}

/** A thread that's left the list (archived, or long done): its name, if Maru knew it, and no buttons. */
function Gone({ title }: { title?: string }) {
  return (
    <div className="piece piece-gone">
      <p className="text-[0.875rem]">{title ? `${title} isn’t on your list any more.` : "That one isn’t on your list any more."}</p>
    </div>
  );
}

/**
 * A thread offered as itself: its head and its steps, the control its card on home has. Tapping
 * a step sets it there and then, and Maru's line under it says what changed.
 */
export function ThreadPiece({
  thread: t,
  title,
  today,
  tz,
  live,
  pending,
  busy,
  onStep,
}: {
  thread: ThreadT | null;
  /** The name it had when offered, for when it's gone. */
  title?: string;
  today: string;
  tz: string;
  /** The newest piece on this thread: the one that can be tapped. */
  live: boolean;
  pending: ThreadStatus | null;
  busy: boolean;
  onStep: (step: ThreadStatus, label: string) => void;
}) {
  if (!t) return <Gone title={title} />;
  return (
    <div data-hue={t.hue % 8} className={`piece ${live ? "" : "piece-past"}`}>
      <ThreadHead thread={t} today={today} tz={tz} />
      {live ? (
        <div className="mt-2.5">
          <ThreadSteps
            thread={t}
            today={today}
            tz={tz}
            paused={false}
            pending={pending}
            disabled={busy}
            onStep={(step) => onStep(step, stepLabel(t, step))}
          />
        </div>
      ) : null}
    </div>
  );
}

const stepLabel = (t: ThreadT, step: ThreadStatus) => stepsFor(t.kind).find((s) => s.value === step)?.label ?? step;

/** Settled some other way since Maru asked: done on its card, paused, today already counted. */
export function settled(t: ThreadT, today: string, tz: string): boolean {
  return t.status === "done" || t.status === "paused" || (t.kind === "habit" && doneToday(t, today, tz));
}

/**
 * A check-in: the thread it's about and the answers Maru asked for, with Not now on every one.
 * Answered, it keeps only the answer. Settled some other way since, or asked again further down,
 * it shows the thread as it is now, with nothing left to tap.
 */
export function CheckIn({
  message: m,
  thread: t,
  today,
  tz,
  live,
  busy,
  onAnswer,
}: {
  message: KataMessage;
  thread: ThreadT | null;
  today: string;
  tz: string;
  live: boolean;
  busy: boolean;
  onAnswer: (value: string, label: string) => void;
}) {
  if (!t) return <Gone />;
  // "Not yet" is an answer of its own; anything else can always be put off with a quiet Not now.
  const main = m.replies.filter((r) => r.label !== "Not now");
  const notNow = !main.some((r) => r.value === "later");
  const chosen = m.answer ? (m.replies.find((r) => r.value === m.answer) ?? (m.answer === "later" ? { label: "Not now", value: "later" } : null)) : null;
  const open = !m.answer && live && !settled(t, today, tz);
  return (
    <div data-hue={t.hue % 8} className={`piece ${open || chosen ? "" : "piece-past"}`}>
      <ThreadHead thread={t} today={today} tz={tz} />
      {chosen ? (
        <p className="answered mt-2.5">
          <Icon name="check" className="h-4 w-4" strokeWidth={2.6} />
          {chosen.label}
        </p>
      ) : open ? (
        <>
          <div role="group" aria-label={`Answer about ${t.title}`} className="answers mt-2.5">
            {main.map((r) => (
              <button key={r.value + r.label} type="button" className="answer press" disabled={busy} onClick={() => onAnswer(r.value, r.label)}>
                {r.label}
              </button>
            ))}
          </div>
          {notNow ? (
            <div className="mt-1.5 flex">
              <button type="button" className="not-now" disabled={busy} onClick={() => onAnswer("later", "Not now")}>
                Not now
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
