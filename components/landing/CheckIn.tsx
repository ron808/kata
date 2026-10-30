"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { KataMark } from "@/components/shared/Avatar";
import { Status } from "@/components/shared/Status";
import type { ThreadStatus } from "@/lib/types";
import {
  JOBS_CHECK,
  JOBS_REPLY,
  MOOD_REPLY,
  MOODS,
  OPENING,
  SIGN_OFF,
  WEBHOOK_REPLY,
  type Line,
} from "./content";
import s from "./landing.module.css";

type Said = Line & { answer?: string };

// The scripted entrance runs in CSS from first paint, so it doesn't wait for hydration:
// each opening line lands at its time (s), after Kata "types" in its slot for a moment.
const LANDS = [0.7, 1.75, 3.05];
const TYPES_FOR = 0.6;
const ENTRANCE_ENDS = 3600;

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * An example morning with Kata: a greeting, the mood check and a check-in on a thread,
 * with replies a visitor can tap. Scripted and local; nothing is sent anywhere.
 */
export function CheckIn() {
  const [lines, setLines] = useState<Said[]>(OPENING);
  const [typing, setTyping] = useState(false);
  const [webhook, setWebhook] = useState<ThreadStatus>("waiting");
  // Once the visitor taps (or the entrance is over), the opening shows without delays.
  const [entered, setEntered] = useState(false);
  const timers = useRef<number[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const height = useRef(0);

  useEffect(() => {
    const pending = timers.current;
    const t = window.setTimeout(() => setEntered(true), ENTRANCE_ENDS);
    return () => {
      window.clearTimeout(t);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // The log is anchored to the bottom of a fixed-height stage, like a chat: new lines push
  // the old ones up (animated), the page never moves, and lines that scroll out of the
  // stage leave the tab order.
  useLayoutEffect(() => {
    const box = stage.current;
    const ol = list.current;
    if (!box || !ol) return;
    const h = ol.offsetHeight;
    const grew = h - height.current;
    height.current = h;
    if (entered && grew > 0 && !calm()) {
      ol.animate([{ transform: `translateY(${grew}px)` }, { transform: "none" }], {
        duration: 450,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
    const top = box.clientHeight - h;
    box.toggleAttribute("data-overflow", top < -1);
    for (const li of Array.from(ol.children) as HTMLElement[]) {
      li.inert = top + li.offsetTop + li.offsetHeight < 12;
    }
  }, [lines, typing, entered]);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function kataSays(next: Line[], then?: () => void) {
    let at = 0;
    next.forEach((line, i) => {
      at += i === 0 ? 450 : 500;
      later(() => setTyping(true), at);
      at += 850;
      later(() => {
        setTyping(false);
        setLines((ls) => [...ls, line]);
        if (i === next.length - 1) then?.();
      }, at);
    });
  }

  function answer(id: string, value: string, label: string) {
    setEntered(true);
    setLines((ls) => [
      ...ls.map((l) => (l.id === id ? { ...l, answer: value } : l)),
      { id: `you-${id}`, from: "you", text: label },
    ]);
    if (id === "mood") kataSays([{ id: "mood-r", from: "kata", text: MOOD_REPLY[value] }]);
    if (id === "webhook") {
      // Kata's reply moves the thread's sticker, then it checks in on the next thread.
      kataSays([{ id: "webhook-r", from: "kata", text: WEBHOOK_REPLY[value] }], () => {
        setWebhook(value as ThreadStatus);
        kataSays([JOBS_CHECK]);
      });
    }
    if (id === "jobs") {
      kataSays([
        { id: "jobs-r", from: "kata", text: JOBS_REPLY[value] },
        { id: "bye", from: "kata", text: SIGN_OFF },
      ]);
    }
  }

  function replay() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setTyping(false);
    setWebhook("waiting");
    setLines(OPENING);
    height.current = 0;
  }

  const done = lines.some((l) => l.id === "bye");

  return (
    <div className="relative">
      <section aria-label="Example: a morning check-in with Maru" className="card p-5 sm:p-6">
        <header className="flex items-center gap-3 pr-24 sm:pr-28">
          <KataMark size={38} />
          <div className="min-w-0">
            <p className="font-semibold leading-tight">Maru</p>
            <p className="text-[0.8125rem] text-ink/65">Checks in every morning</p>
          </div>
        </header>

        <div ref={stage} className="group relative mt-5">
          {/* Sizer: the opening, invisible, so the stage is exactly as tall as it at every width. */}
          <ol aria-hidden inert className="invisible space-y-3.5">
            {OPENING.map((l) => (
              <KataLine key={l.id} line={l} />
            ))}
          </ol>
          {/* Clipped only at the top and bottom (with room below for the last row's shadow),
              so focus rings and shadows at the sides are never cut. */}
          <div className="absolute inset-x-0 -bottom-2 top-0 overflow-y-clip">
            <ol ref={list} aria-live="polite" className="absolute inset-x-0 bottom-2 space-y-3.5">
              {lines.map((l) => {
                const i = OPENING.findIndex((o) => o.id === l.id);
                const opening = i >= 0 && !entered;
                return l.from === "kata" ? (
                  <KataLine
                    key={l.id}
                    line={l}
                    lands={opening ? LANDS[i] : undefined}
                    onAnswer={(value, label) => !l.answer && answer(l.id, value, label)}
                  />
                ) : (
                  <li key={l.id} className="appear flex justify-end">
                    <p className="bubble-you max-w-[30ch] px-4 py-2.5 font-medium">{l.text}</p>
                  </li>
                );
              })}
              {typing ? (
                <li className="appear flex">
                  <span className="bubble-kata px-4 py-3.5">
                    <span className="typing" role="status" aria-label="Maru is typing">
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                </li>
              ) : null}
              {done && !typing ? (
                <li className="appear">
                  <button type="button" className="chip" onClick={replay}>
                    Play it again
                  </button>
                </li>
              ) : null}
            </ol>
          </div>
          {/* Once older lines scroll up out of the stage, they fade under the card's edge. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-linear-to-b from-surface to-transparent opacity-0 transition-opacity duration-300 group-data-[overflow]:opacity-100"
          />
        </div>
      </section>

      {/* The thread this check-in is about, stuck on the card's corner: replies move it. */}
      <span
        aria-hidden
        className="map-node right-0 top-0 [--s:6rem] sm:[--s:7rem]"
        data-hue={0}
        style={{ "--x": "auto", "--y": "auto", "--tilt": "8deg", translate: "-0.75rem -56%" } as CSSProperties}
      >
        <span className="map-title text-[clamp(0.75rem,calc(var(--s)*0.15),1rem)]">Payments webhook</span>
        <span className="absolute left-1/2 top-[calc(100%-0.85rem)] -translate-x-1/2">
          <span
            key={webhook}
            className={`${s.restamp} inline-flex rounded-full border-2 border-edge bg-surface px-2 py-0.5 shadow-sticker-sm`}
          >
            <Status status={webhook} />
          </span>
        </span>
      </span>
    </div>
  );
}

function KataLine({
  line,
  lands,
  onAnswer,
}: {
  line: Said;
  /** When this line lands in the scripted entrance (s); omitted, it shows at once. */
  lands?: number;
  onAnswer?: (value: string, label: string) => void;
}) {
  const at = (d: number): CSSProperties | undefined =>
    lands === undefined ? undefined : { animationDelay: `${lands + d}s` };
  const enter = lands === undefined ? "" : "appear motion-reduce:animate-none";
  const answered = Boolean(line.answer);

  return (
    <li className="relative flex flex-col items-start gap-2.5">
      {lands !== undefined ? (
        <span
          aria-hidden
          className={`${s.typingSlot} bubble-kata absolute left-0 top-0 px-4 py-3.5`}
          style={{ animationDelay: `${lands - TYPES_FOR}s`, animationDuration: `${TYPES_FOR}s` }}
        >
          <span className="typing">
            <i />
            <i />
            <i />
          </span>
        </span>
      ) : null}
      <p className={`${enter} bubble-kata max-w-[34ch] px-4 py-3`} style={at(0)}>
        {line.text}
      </p>
      {line.mood ? (
        <div role="group" aria-label={line.text} className={`${enter} scale w-full max-w-[26rem]`} style={at(0.15)}>
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              className="scale-step"
              aria-pressed={line.answer === m.value}
              disabled={answered && line.answer !== m.value}
              onClick={() => onAnswer?.(m.value, m.label)}
            >
              <MoodDots value={Number(m.value)} />
              {m.label}
            </button>
          ))}
        </div>
      ) : null}
      {line.replies ? (
        <div className={`${enter} flex flex-wrap gap-2`} style={at(0.15)}>
          {line.replies.map((r) => (
            <button
              key={r.value}
              type="button"
              className="chip"
              aria-pressed={line.answer === r.value}
              disabled={answered && line.answer !== r.value}
              onClick={() => onAnswer?.(r.value, r.label)}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/** Five steps drawn as dots, so moods don't lean on emoji. */
function MoodDots({ value }: { value: number }) {
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-[5px] w-[5px] rounded-full bg-current ${i <= value ? "" : "opacity-25"}`} />
      ))}
    </span>
  );
}
