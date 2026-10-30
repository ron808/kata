"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CircleActions, CircleState } from "./CirclesPrototype";
import { EASE, LockGlyph, Mood } from "./bits";
import { MY_WEEK } from "./data";

/** Your offered lines for the week, with what Wednesday became on the Tonight screen. */
export function weekLines(state: CircleState) {
  const lineOffered = state.fields.find((f) => f.kind === "line")!.offered;
  return MY_WEEK.map((d) =>
    d.id === "wed"
      ? { ...d, mood: state.mood, line: state.sealed && lineOffered && state.line.trim() ? state.line.trim() : null }
      : d
  );
}

export function SaturdayPreview({ state, actions }: { state: CircleState; actions: CircleActions }) {
  const days = weekLines(state);
  const offered = days.filter((d) => d.line);
  const kept = offered.filter((d) => !state.struck[d.id]);
  const privateFields = state.fields.filter((f) => !f.offered);

  return (
    <div>
      <div className="max-w-2xl">
        <h2 className="font-display text-display-m">Saturday morning</h2>
        <p className="mt-2 text-ink/70">Before Kata writes to the Rao family, you see exactly what it may quote. Strike anything. No reason needed.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section aria-labelledby="draw-title" className="sheet min-w-0 px-[clamp(1.1rem,4vw,2.75rem)] py-[clamp(1.4rem,4vw,2.5rem)]">
          <header className="rule border-b pb-5">
            <h3 id="draw-title" className="font-display text-[clamp(1.6rem,1.3rem+1.2vw,2.2rem)] leading-tight">
              Here is what Kata may draw from your week
            </h3>
            <p className="mt-2 text-sm text-ink/65" aria-live="polite">
              {kept.length} of {offered.length} lines offered · quoted word for word, with your name
            </p>
          </header>
          <ol className="divide-y divide-ink/10">
            {days.map((d) => (
              <DayLine key={d.id} day={d} struck={!!state.struck[d.id]} onToggle={() => actions.toggleStrike(d.id)} onSeal={state.sealed ? undefined : () => actions.setSealed(true)} />
            ))}
          </ol>
        </section>

        <aside className="min-w-0 space-y-8 lg:sticky lg:top-6 lg:self-start">
          <section aria-labelledby="cutoff" className="chapter rounded-xs px-5 py-5">
            <h3 id="cutoff" className="font-display text-[1.6rem] leading-tight">
              Kata writes at 10 pm
            </h3>
            <p className="mt-2 text-[0.9375rem] text-ink/75">
              Strikes hold until then. After that the letter is sealed and goes out on Sunday morning, to all five of you at once.
            </p>
          </section>
          <section aria-labelledby="never">
            <h3 id="never" className="flex items-center gap-2 font-display text-[1.35rem] leading-tight">
              <LockGlyph className="h-5 w-5 text-ink/65" />
              Kata never reads these
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {privateFields.map((f) => (
                <li key={f.id} className="rounded-full border border-ink/15 px-3 py-1.5 text-sm text-ink/75">
                  {f.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink/65">Private fields never reach the letter, and nothing is guessed from them.</p>
          </section>
          <section aria-labelledby="others">
            <h3 id="others" className="font-display text-[1.35rem] leading-tight">
              Everyone else’s lines
            </h3>
            <p className="mt-2 text-sm text-ink/70">Are theirs to strike. You’ll read what stayed on Sunday, like everyone else.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DayLine({
  day,
  struck,
  onToggle,
  onSeal,
}: {
  day: ReturnType<typeof weekLines>[number];
  struck: boolean;
  onToggle: () => void;
  /** Only while Wednesday is unsealed in the demo. */
  onSeal?: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <li className="grid grid-cols-1 gap-x-6 gap-y-2 py-5 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center">
      <p className="flex items-baseline gap-2 sm:block">
        <span className="font-display text-[1.45rem] leading-none sm:block">{day.day}</span>
        <span className="text-[0.8125rem] text-ink/65 sm:mt-1 sm:block">{day.date}</span>
      </p>
      {day.line ? (
        <>
          <p className="flex min-w-0 items-start gap-3">
            <span className="relative min-w-0 flex-1">
              <span
                className={`text-[1.1875rem] leading-relaxed transition-colors duration-500 ${ struck ? "text-ink/65 line-through decoration-ink/70 decoration-[1.5px]" : ""
                }`}
              >
                {day.line}
              </span>
              {struck ? <span className="mt-1 block text-[0.8125rem] text-ink/70">Struck. Kata won’t quote it.</span> : null}
            </span>
            <motion.span animate={{ opacity: struck ? 0.4 : 1 }} transition={{ duration: reduce ? 0 : 0.4, ease: EASE }} className="mt-1">
              <Mood level={day.mood} />
            </motion.span>
          </p>
          <button
            type="button"
            aria-pressed={struck}
            aria-label={`Strike ${day.day}’s line`}
            onClick={onToggle}
            className={`inline-flex h-11 items-center justify-center gap-2 justify-self-start rounded-md border px-4 text-[0.875rem] transition-colors duration-300 sm:justify-self-end ${ struck ? "border-ink bg-ink text-ground" : "border-ink/20 text-ink hover:border-ink/45"
            }`}
          >
            <StrikeGlyph />
            Strike
          </button>
        </>
      ) : (
        <div className="sm:col-span-2">
          <p className="text-[1.0625rem] text-ink/65">
            {day.id === "wed" && onSeal ? "Not sealed yet, so nothing from Wednesday is offered." : "Nothing offered that day."}
          </p>
          {day.id === "wed" && onSeal ? (
            <button
              type="button"
              onClick={onSeal}
              className="-ml-3 mt-1 inline-flex h-11 items-center rounded-md px-3 text-[0.875rem] font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              Seal Wednesday’s line
            </button>
          ) : null}
        </div>
      )}
    </li>
  );
}

function StrikeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="h-4 w-4 shrink-0" aria-hidden focusable="false">
      <path d="M4 12h16M8 7.5c.6-1.4 2-2.5 4-2.5 2.3 0 3.8 1.2 4 2.8M16 16c-.4 1.8-2 3-4.2 3-2.3 0-3.8-1.1-4.3-2.6" />
    </svg>
  );
}
