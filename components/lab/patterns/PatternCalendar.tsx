"use client";

import { useState } from "react";
import { DaysLine, Dot, HowWorkedOut, NotYet, Nothing, OUTCOME_LABELS, Scale, Sides, Strength } from "@/components/breakdowns/Patterns";
import { weekdayIndex } from "@/lib/breakdowns/period";
import { enoughDays, patternSaid, type Outcome, type Patterns } from "@/lib/patterns/compute";

/*
 * Patterns as the days themselves: a calendar of the last two months with each day's mood as a
 * bar, and one thing picked at a time, whose days are tinted. The writer sees the evidence and
 * the comparison under it, worked out the same way as everywhere else.
 */

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const WHAT = { mood: "Mood", energy: "Energy" } as const;

export function PatternCalendar({ p, name }: { p: Patterns; name: string }) {
  // Strongest first, then the rest of what can be compared, then what's still waiting.
  const order = [...p.found, ...p.flat].map((x) => x.activity.key);
  const things = p.activities
    .filter((a) => Object.keys(a.on).length)
    .sort((a, b) => (order.indexOf(a.key) + 1 || 999) - (order.indexOf(b.key) + 1 || 999));
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  if (!enoughDays(p)) return <NotYet p={p} name={name} />;

  const a = things.find((t) => t.key === picked) ?? things[0];
  if (!a) {
    return (
      <div>
        <DaysLine p={p} />
        <Nothing p={p} />
        <HowWorkedOut name={name} />
      </div>
    );
  }
  const compared = [...p.found, ...p.flat].filter((x) => x.activity.key === a.key);
  const both = p.moods > 0 && p.energies > 0;
  const showing: Outcome = outcome ?? compared[0]?.outcome ?? (p.moods >= p.energies ? "mood" : "energy");
  const pattern = compared.find((x) => x.outcome === showing) ?? null;
  const waiting = p.waiting.find((w) => w.key === a.key) ?? null;
  const labels = OUTCOME_LABELS[showing];
  const blanks = weekdayIndex(p.days[0]?.day ?? p.from);
  const yes = Object.values(a.on).filter(Boolean).length;
  // The days it happened are filled: its thread's colour, or for the writer's own question or tag,
  // marker yellow, the colour of their own words. The bar on them takes the colour that reads on it.
  const filled = a.hue === null ? "border-edge bg-sun" : "border-edge bg-hue";
  const bar = a.hue === null ? "bg-on-sun" : "bg-on-hue";

  return (
    <div>
      <DaysLine p={p} />
      <div role="radiogroup" aria-label="Days to show" className="mt-4 flex flex-wrap gap-2">
        {things.map((t) => (
          <button key={t.key} type="button" role="radio" aria-checked={t.key === a.key} className="chip chip-sm max-w-full" onClick={() => (setPicked(t.key), setOutcome(null))}>
            <Dot hue={t.hue} className="h-3 w-3" />
            <span className="truncate">{t.kind === "tag" ? `#${t.title}` : t.title}</span>
            {t.detail ? <span className="font-normal opacity-75">{t.detail}</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div>
          {both ? (
            <div role="radiogroup" aria-label="Show" className="scale mb-4 max-w-[14rem]">
              {(["mood", "energy"] as const).map((o) => (
                <button key={o} type="button" role="radio" aria-checked={showing === o} className="scale-step scale-row" onClick={() => setOutcome(o)}>
                  {WHAT[o]}
                </button>
              ))}
            </div>
          ) : null}
          <div
            role="img"
            aria-label={`The last ${p.days.length} days: ${yes} ${a.sides[0] ? a.sides[0].toLowerCase() : "logged"}, each with its ${showing} as a bar`}
            data-hue={a.hue ?? undefined}
            className="grid grid-cols-7 gap-1.5"
          >
            {LETTERS.map((l, i) => (
              <span key={i} aria-hidden className="pb-0.5 text-center text-[0.8125rem] font-semibold text-ink/65">
                {l}
              </span>
            ))}
            {Array.from({ length: blanks }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden />
            ))}
            {p.days.map((d) => {
              const side = a.on[d.day];
              const level = d[showing];
              return (
                <span
                  key={d.day}
                  aria-hidden
                  className={`relative block aspect-square overflow-clip rounded-[6px] border-2 ${side === true ? filled : side === false ? "border-edge/30" : "border-dashed border-edge/20"}`}
                >
                  {level !== null ? (
                    <span className={`absolute inset-x-[3px] bottom-[3px] rounded-[3px] ${side === true ? bar : "bg-ink/70"}`} style={{ height: `calc((100% - 6px) * ${level / 5})` }} />
                  ) : null}
                </span>
              );
            })}
          </div>
          <ul aria-hidden className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] text-ink/70">
            <li className="flex items-center gap-1.5">
              <span data-hue={a.hue ?? undefined} className={`h-3.5 w-3.5 rounded-[4px] border-2 ${filled}`} />
              {a.sides[0] || "Logged"}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="relative h-3.5 w-3.5 rounded-[4px] border-2 border-edge/30">
                <span className="absolute inset-x-[2px] bottom-[2px] h-1.5 rounded-[1px] bg-ink/70" />
              </span>
              {WHAT[showing]}: taller is {labels[4].toLowerCase()}er
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-[4px] border-2 border-dashed border-edge/30" />
              Nothing logged
            </li>
          </ul>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Dot hue={a.hue} />
            <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{a.kind === "tag" ? `#${a.title}` : a.title}</span>
            {pattern ? (
              <span className="ml-auto">
                <Strength p={pattern} />
              </span>
            ) : null}
          </div>
          {pattern ? (
            <>
              <div className="mt-3 max-w-[28rem]">
                <Scale p={pattern} hue={a.hue} />
                <Sides p={pattern} hue={a.hue} />
              </div>
              <p className="mt-4 max-w-[60ch] text-[0.9375rem] text-ink/75">{patternSaid(pattern)}</p>
            </>
          ) : (
            <p className="mt-3 max-w-[60ch] text-[0.9375rem] text-ink/75">
              {waiting ? `Too early to tell: ${waiting.note.charAt(0).toLowerCase()}${waiting.note.slice(1)} so far.` : `Not enough days with your ${showing} to compare yet.`}
            </p>
          )}
        </div>
      </div>
      <HowWorkedOut name={name} />
    </div>
  );
}
