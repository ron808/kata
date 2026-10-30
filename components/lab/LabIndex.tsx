"use client";

import Link from "next/link";
import { Icon } from "@/components/shared/Icon";
import { CONCEPTS } from "./concepts";
import { useVerdicts, type Verdict } from "./decisions";

const LABEL: Record<Verdict, string> = { keep: "Keep", maybe: "Maybe", drop: "Not for us" };

export function LabIndex() {
  const verdicts = useVerdicts();
  const built = CONCEPTS.filter((c) => c.slug);
  const rest = CONCEPTS.filter((c) => !c.slug);
  const counts = (["keep", "maybe", "drop"] as Verdict[]).map((v) => [v, Object.values(verdicts).filter((x) => x === v).length] as const);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2" aria-live="polite">
        {counts.map(([v, n]) => (
          <span key={v} className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 px-3.5 text-sm text-ink/75">
            {LABEL[v]} <span className="tabular-nums text-ink">{n}</span>
          </span>
        ))}
        <span className="inline-flex h-9 items-center px-1 text-sm text-ink/65">
          of {built.length} prototypes
        </span>
      </div>

      <ol className="rule mt-10 divide-y divide-ink/10 border-y">
        {built.map((c, i) => {
          const v = c.slug ? verdicts[c.slug] : undefined;
          return (
            <li key={c.id}>
              <Link
                href={`/lab/${c.slug}`}
                className="group grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-7 transition-colors duration-300 hover:bg-ink/[0.025] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-x-8"
              >
                <span className="self-start font-display text-[2.25rem] leading-none tabular-nums text-ink/45 sm:text-[3rem]">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-[clamp(1.9rem,1.5rem+1.4vw,2.75rem)] leading-none">{c.title}</span>
                    <span className="font-display text-xl text-ink/65">{c.subtitle}</span>
                  </span>
                  <span className="mt-3 block max-w-2xl text-[0.9375rem] text-ink/75">{c.pitch}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/65">
                    <span className="tabular-nums">Panel score {c.score.toFixed(1)}</span>
                    <span>wow {c.scores.wow} · fit {c.scores.fit} · retention {c.scores.retention}</span>
                  </span>
                </span>
                <span className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:row-start-1 sm:self-center">
                  {v ? (
                    <span className={`inline-flex h-8 items-center rounded-full px-3 text-sm ${v === "keep" ? "bg-accent text-on-accent" : v === "maybe" ? "bg-ink/10 text-ink" : "border border-ink/20 text-ink/65"}`}>
                      {LABEL[v]}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium">
                    Open
                    <Icon name="arrow" className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="also" className="mt-20">
        <h2 id="also" className="font-display text-display-m">Also considered</h2>
        <p className="mt-3 max-w-2xl text-ink/70">
          Concepts the panel scored lower or that overlap with a prototype. Two Pens, a volume
          for two, would be a circle of two inside Circles.
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
          {rest.map((c) => (
            <li key={c.id} className="rule border-t pt-5">
              <p className="flex items-baseline justify-between gap-4">
                <span className="font-display text-[1.6rem] leading-tight">{c.title}</span>
                <span className="shrink-0 text-sm tabular-nums text-ink/65">{c.score.toFixed(1)}</span>
              </p>
              <p className="mt-1 font-display text-lg text-ink/65">{c.subtitle}</p>
              <p className="mt-2 text-[0.9375rem] text-ink/75">{c.pitch}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
