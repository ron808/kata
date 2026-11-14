import Link from "next/link";
import type { ReactNode } from "react";
import { ENERGY_LABELS, MOOD_LABELS } from "@/components/entry/fields/meters";
import { MIN_DAYS, MIN_SIDE, WINDOW_DAYS, byActivity, enoughDays, num, patternSaid, type ActivityRef, type Pattern, type Patterns } from "@/lib/patterns/compute";
import { Meter } from "./Charts";

/*
 * Patterns, drawn: each thing compared is a row, and each comparison a scale of five with two
 * marks, the filled one for days it happened and the open one for days it didn't. No hooks, so
 * pages render it on the server and the Lab in the browser.
 */

export const OUTCOME_LABELS = {
  mood: MOOD_LABELS,
  energy: ENERGY_LABELS,
} as const;
const WHAT = { mood: "Mood", energy: "Energy" } as const;
const lower = (s: string) => (/^[A-Z][a-z’']/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Where a 1–5 average sits along the scale. */
const at = (average: number) => `${((Math.min(5, Math.max(1, average)) - 1) / 4) * 100}%`;

/** "higher on days done", "lower on days at 9 or more": what the scale shows, under the row's title. */
export function captionOf(p: Pattern): string {
  const way = p.gap > 0 ? "higher" : p.gap < 0 ? "lower" : "the same";
  const on = {
    habit: "on days done",
    number: `on days at ${lower(p.activity.sides[0])}`,
    yes: "on days you said yes",
    tag: "on days tagged",
    moved: "on days you moved something",
  }[p.activity.kind];
  return `${WHAT[p.outcome]} ${way} ${on}`;
}

/** The thing's own dot: its thread's colour, or ink for a page's question or tag. */
export function Dot({ hue, className = "h-3.5 w-3.5" }: { hue: number | null; className?: string }) {
  return <span aria-hidden data-hue={hue ?? undefined} className={`shrink-0 rounded-full border-2 border-edge ${hue === null ? "bg-ink" : "bg-hue"} ${className}`} />;
}

export function Strength({ p }: { p: Pattern }) {
  if (p.strength === "none") return null;
  return p.strength === "clear" ? (
    <span className="inline-flex h-[1.6rem] shrink-0 items-center rounded-full border-[1.5px] border-edge px-2.5 text-[0.8125rem] font-semibold">Clear so far</span>
  ) : (
    <span className="inline-flex h-[1.6rem] shrink-0 items-center rounded-full border-[1.5px] border-dashed border-edge/70 px-2.5 text-[0.8125rem] font-semibold text-ink/75">
      Worth watching
    </span>
  );
}

/** The scale of five with the two sides' averages on it. */
export function Scale({ p, hue }: { p: Pattern; hue: number | null }) {
  const labels = OUTCOME_LABELS[p.outcome];
  const [lo, hi] = [Math.min(p.yes.average, p.no.average), Math.max(p.yes.average, p.no.average)];
  return (
    <div aria-hidden data-hue={hue ?? undefined}>
      <div className="relative mx-[11px] h-8">
        <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-ink/15" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="absolute top-1/2 h-2.5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/25" style={{ left: `${i * 25}%` }} />
        ))}
        <span className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-ink/25" style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }} />
        <span className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-edge bg-surface" style={{ left: at(p.no.average) }} />
        <span
          className={`absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-edge ${hue === null ? "bg-ink" : "bg-hue"}`}
          style={{ left: at(p.yes.average) }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[0.8125rem] text-ink/65">
        <span>{labels[0]}</span>
        <span>{labels[2]}</span>
        <span>{labels[4]}</span>
      </div>
    </div>
  );
}

/** What the two marks are: "● Done · 4.1 · 12 days   ○ Not done · 3.3 · 9 days". */
export function Sides({ p, hue }: { p: Pattern; hue: number | null }) {
  return (
    <dl aria-hidden className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem]">
      {[p.yes, p.no].map((s, i) => (
        <div key={i} className="flex min-w-0 items-center gap-2">
          <dt className="flex min-w-0 items-center gap-2">
            {i === 0 ? <Dot hue={hue} className="h-3 w-3" /> : <span className="h-3 w-3 shrink-0 rounded-full border-2 border-edge bg-surface" />}
            <span className="font-semibold">{s.label}</span>
          </dt>
          <dd className="whitespace-nowrap tabular-nums text-ink/70">
            {num(s.average)} · {plural(s.days, "day")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The thing's name, linked to its thread when it has one. */
export function Title({ a, link = true }: { a: ActivityRef; link?: boolean }) {
  const name = (
    <>
      <span className="font-semibold">{a.kind === "tag" ? `#${a.title}` : a.title}</span>
      {a.detail ? <span className="text-ink/65"> · {a.detail}</span> : null}
    </>
  );
  return a.href && link ? (
    <Link href={a.href} className="min-w-0 hover:underline">
      {name}
    </Link>
  ) : (
    <span className="min-w-0">{name}</span>
  );
}

/** One thing and what went with it: a scale for its mood, and one for its energy if both were compared. */
export function PatternRow({ activity, patterns, link = true }: { activity: ActivityRef; patterns: Pattern[]; link?: boolean }) {
  const strongest = patterns[0];
  return (
    <li className="rule border-t-2 py-5 first:border-t-0 first:pt-1 last:pb-1 xl:[&:nth-child(2)]:border-t-0 xl:[&:nth-child(2)]:pt-1">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Dot hue={activity.hue} />
        <Title a={activity} link={link} />
        <span className="ml-auto">
          <Strength p={strongest} />
        </span>
      </div>
      {patterns.map((p) => (
        <div key={p.key} className="mt-3">
          <p className="text-[0.875rem] font-semibold text-ink/75">{captionOf(p)}</p>
          <p className="sr-only">{patternSaid(p)}</p>
          <div className="mt-1 max-w-[28rem]">
            <Scale p={p} hue={activity.hue} />
            <Sides p={p} hue={activity.hue} />
          </div>
        </div>
      ))}
    </li>
  );
}

/** What was compared with no clear gap, and what can't be told yet. */
export function TheRest({ p }: { p: Patterns }) {
  const flat = byActivity(p.flat);
  const waiting = p.waiting.slice(0, 6);
  if (!flat.length && !waiting.length) return null;
  return (
    <div className="rule mt-5 grid grid-cols-1 gap-5 border-t-2 pt-5 sm:grid-cols-2">
      {flat.length ? (
        <div>
          <h3 className="text-[0.9375rem] font-semibold">No clear difference</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {flat.map(({ activity, patterns }) => {
              // Said which, when the same thing has a pattern on the other one, or only its energy was compared.
              const which = p.found.some((f) => f.activity.key === activity.key) || patterns.every((x) => x.outcome === "energy");
              return (
                <li key={activity.key} className="max-w-full">
                  <span className="inline-flex h-[1.75rem] max-w-full items-center gap-1.5 rounded-full border-[1.5px] border-edge px-2.5 text-[0.8125rem] font-semibold">
                    <Dot hue={activity.hue} className="h-2.5 w-2.5" />
                    <span className="truncate">{activity.kind === "tag" ? `#${activity.title}` : activity.title}</span>
                    {which ? <span className="font-normal text-ink/65">{patterns.map((x) => x.outcome).join(", ")}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {waiting.length ? (
        <div>
          <h3 className="text-[0.9375rem] font-semibold">Too early to tell</h3>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 text-[0.875rem]">
            {waiting.map((w) => (
              <li key={w.key} className="flex min-w-0 items-baseline gap-2">
                <Dot hue={w.activity.hue} className="h-2.5 w-2.5 translate-y-[1px]" />
                <span className="min-w-0">
                  <span className="font-semibold">{w.activity.kind === "tag" ? `#${w.activity.title}` : w.activity.title}</span>
                  <span className="text-ink/70"> · {w.note}</span>
                </span>
              </li>
            ))}
            {p.waiting.length > waiting.length ? <li className="text-ink/70">and {p.waiting.length - waiting.length} more</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** How it's worked out, under every look. */
export function HowWorkedOut({ name }: { name: string }) {
  return (
    <p className="mt-5 max-w-[62ch] text-[0.875rem] text-ink/70">
      Worked out from what you logged in the last {WINDOW_DAYS} days, not judged by {name}. Each thing you keep splits your days in two, and the average mood (or energy) of each
      side is compared once both have {MIN_SIDE} days. Clear means a gap that size rarely comes by chance; worth watching means it could. It shows what went together, not what
      caused what.
    </p>
  );
}

const EXAMPLE: Pattern = {
  key: "example",
  activity: {
    key: "example",
    kind: "habit",
    title: "Walk",
    detail: "",
    hue: 3,
    href: null,
    sides: ["Done", "Not done"],
  },
  outcome: "mood",
  yes: { label: "Done", days: 12, average: 4.1 },
  no: { label: "Not done", days: 9, average: 3.3 },
  gap: 0.8,
  t: 3.4,
  strength: "clear",
};

/** Before there are enough days: how many so far, what makes a day count, and what's coming. */
export function NotYet({ p, name }: { p: Patterns; name: string }) {
  const have = p.moods;
  return (
    <div className="grid grid-cols-1 gap-5">
      <div>
        <p className="font-semibold">
          {have} of {MIN_DAYS} days with a mood so far
        </p>
        <div className="max-w-[20rem]">
          <Meter value={have / MIN_DAYS} />
        </div>
        <p className="mt-3 max-w-[56ch] text-[0.9375rem] text-ink/75">
          A day counts once it has a mood: answer {name}’s mood check, or the mood on your page. After {MIN_DAYS} days, this shows what went with your better and worse ones.
        </p>
      </div>
      <figure className="well p-4">
        <figcaption className="text-[0.8125rem] font-semibold text-ink/70">An example, made up</figcaption>
        <ul className="mt-2">
          <PatternRow activity={EXAMPLE.activity} patterns={[EXAMPLE]} link={false} />
        </ul>
      </figure>
    </div>
  );
}

/** With days to go on but nothing found: whether anything was compared at all, and where patterns come from. */
export function Nothing({ p }: { p: Patterns }) {
  return p.activities.length ? (
    <p className="mt-4 font-semibold">Nothing stands out yet.</p>
  ) : (
    <p className="mt-4 max-w-[56ch] text-[0.9375rem] text-ink/75">
      <span className="font-semibold text-ink">Nothing to compare yet.</span> Patterns come from habits and numbers on your threads, and from yes-or-no questions, numbers and tags on your pages.
    </p>
  );
}

/** The opening line: how many days there are to go on. */
export function DaysLine({ p }: { p: Patterns }) {
  return (
    <p className="text-[0.9375rem] text-ink/75">
      The last {WINDOW_DAYS} days: {plural(p.moods, "day")} with a mood
      {p.energies ? `, ${p.energies} with your energy` : ""}.
    </p>
  );
}

/** The patterns as rows, strongest first, then the rest and how it's worked out. */
export function PatternRows({ p, name }: { p: Patterns; name: string }) {
  if (!enoughDays(p)) return <NotYet p={p} name={name} />;
  const found = byActivity(p.found);
  return (
    <div>
      <DaysLine p={p} />
      {found.length ? (
        <ul className="mt-4 grid grid-cols-1 items-start gap-x-10 xl:grid-cols-2">
          {found.map((g) => (
            <PatternRow key={g.activity.key} activity={g.activity} patterns={g.patterns} />
          ))}
        </ul>
      ) : (
        <Nothing p={p} />
      )}
      <TheRest p={p} />
      <HowWorkedOut name={name} />
    </div>
  );
}

/** Patterns as a section of a page, with its heading. `children` is the look; rows by default. */
export function PatternsCard({ p, name, children }: { p: Patterns; name: string; children?: ReactNode }) {
  return (
    <section id="patterns" aria-labelledby="patterns-heading" className="card p-5 sm:p-6">
      <h2 id="patterns-heading" className="font-display text-display-s">
        Patterns
      </h2>
      <p className="mt-1 max-w-[56ch] text-[0.9375rem] text-ink/75">What went with your better and worse days, from what you logged.</p>
      <div className="mt-4">{children ?? <PatternRows p={p} name={name} />}</div>
    </section>
  );
}
