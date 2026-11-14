"use client";

import { useState } from "react";
import { DaysLine, HowWorkedOut, NotYet, Nothing, Scale, Strength, TheRest } from "@/components/breakdowns/Patterns";
import { enoughDays, num, patternSaid, sidesSaid, type Patterns } from "@/lib/patterns/compute";

/*
 * Patterns one at a time, each a statement with its two numbers as big as the page allows: the
 * day it happened in its colour, stuck on, and the days it didn't beside it. Back and Next go
 * through them, strongest first.
 */

const WHAT = { mood: "Mood", energy: "Energy" } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

export function PatternCards({ p, name }: { p: Patterns; name: string }) {
  const [at, setAt] = useState(0);
  if (!enoughDays(p)) return <NotYet p={p} name={name} />;
  if (!p.found.length) {
    return (
      <div>
        <DaysLine p={p} />
        <Nothing p={p} />
        <TheRest p={p} />
        <HowWorkedOut name={name} />
      </div>
    );
  }
  const i = Math.min(at, p.found.length - 1);
  const x = p.found[i];
  const hue = x.activity.hue;
  const [on] = sidesSaid(x.activity);
  return (
    <div>
      <DaysLine p={p} />
      <article aria-roledescription="pattern" aria-label={`${i + 1} of ${p.found.length}`} className="well mt-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.875rem] font-semibold tabular-nums text-ink/70">
            {i + 1} of {p.found.length}
          </p>
          <Strength p={x} />
        </div>
        <p className="mt-4 text-[1.0625rem] font-semibold [overflow-wrap:anywhere]">{cap(on)}</p>
        <p className="mt-1 font-display text-display-m leading-[0.95]">
          {WHAT[x.outcome]} {x.gap > 0 ? "higher" : "lower"}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
          <figure className="flex items-center gap-3">
            <span
              data-hue={hue ?? undefined}
              className={`grid h-20 w-20 shrink-0 -rotate-3 place-items-center rounded-full border-2 border-edge shadow-sticker sm:h-24 sm:w-24 ${hue === null ? "bg-ink text-ground" : "bg-hue text-on-hue"}`}
            >
              <span className="font-display text-[2.25rem] leading-none tabular-nums sm:text-[2.75rem]">{num(x.yes.average)}</span>
            </span>
            <figcaption className="text-[0.875rem] leading-snug">
              <span className="block font-semibold">{x.yes.label}</span>
              <span className="text-ink/70">{plural(x.yes.days, "day")}</span>
            </figcaption>
          </figure>
          <figure className="flex items-center gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-edge bg-surface sm:h-20 sm:w-20">
              <span className="font-display text-[1.75rem] leading-none tabular-nums sm:text-[2.125rem]">{num(x.no.average)}</span>
            </span>
            <figcaption className="text-[0.875rem] leading-snug">
              <span className="block font-semibold">{x.no.label}</span>
              <span className="text-ink/70">{plural(x.no.days, "day")}</span>
            </figcaption>
          </figure>
        </div>
        <div className="mt-6 max-w-[28rem]">
          <Scale p={x} hue={hue} />
        </div>
        <p className="mt-4 max-w-[60ch] text-[0.9375rem] text-ink/75">{patternSaid(x)}</p>
      </article>
      {p.found.length > 1 ? (
        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="chip" onClick={() => setAt(i - 1)} disabled={i === 0}>
            Back
          </button>
          <button type="button" className="chip" onClick={() => setAt(i + 1)} disabled={i === p.found.length - 1}>
            Next
          </button>
          <span aria-hidden className="ml-2 flex gap-1.5">
            {p.found.map((f, n) => (
              <span key={f.key} className={`h-2.5 w-2.5 rounded-full border-2 border-edge ${n === i ? "bg-ink" : "bg-transparent"}`} />
            ))}
          </span>
        </div>
      ) : null}
      <TheRest p={p} />
      <HowWorkedOut name={name} />
    </div>
  );
}
