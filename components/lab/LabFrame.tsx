"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/shared/Icon";
import type { Concept } from "./concepts";
import { setVerdict, useVerdicts, type Verdict } from "./decisions";

export interface LabScreen {
  id: string;
  label: string;
  content: ReactNode;
}

const SHOW = "kata-lab:screen";

/** Let a screen open another screen of the same prototype (e.g. "Write back" → Slow mail). */
export function showLabScreen(id: string) {
  window.dispatchEvent(new CustomEvent(SHOW, { detail: id }));
}

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: "keep", label: "Keep" },
  { value: "maybe", label: "Maybe" },
  { value: "drop", label: "Not for us" },
];

/**
 * The frame every Lab prototype sits in: what the idea is, its screens as tabs, and a
 * place to give it a verdict. Every screen stays mounted, so state survives tab switches.
 */
export function LabFrame({ concept, screens }: { concept: Concept; screens: LabScreen[] }) {
  const [active, setActive] = useState(screens[0].id);
  const verdicts = useVerdicts();
  const verdict = concept.slug ? verdicts[concept.slug] : undefined;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const strip = useRef<HTMLDivElement | null>(null);

  // A screen asked for another screen: switch, then bring the tabs back into view.
  useEffect(() => {
    const onShow = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!screens.some((s) => s.id === id)) return;
      setActive(id);
      requestAnimationFrame(() => {
        const el = strip.current;
        if (!el) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: reduce ? "auto" : "smooth" });
        tabs.current[screens.findIndex((s) => s.id === id)]?.focus({ preventScroll: true });
      });
    };
    window.addEventListener(SHOW, onShow);
    return () => window.removeEventListener(SHOW, onShow);
  }, [screens]);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = screens.findIndex((s) => s.id === active);
    const next = e.key === "ArrowRight" ? (i + 1) % screens.length : e.key === "ArrowLeft" ? (i - 1 + screens.length) % screens.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(screens[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <div className="mx-auto w-full max-w-[72rem] px-margin pb-24 pt-[clamp(1.25rem,3.5vw,2.75rem)]">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/lab" className="-ml-2 inline-flex h-11 items-center gap-2 rounded-md px-2 text-[0.9375rem] text-ink/70 hover:text-ink">
          <Icon name="arrow-left" className="h-4 w-4" />
          The Lab
        </Link>
        <p className="rounded-full border border-ink/15 px-3 py-1.5 text-[0.8125rem] text-ink/65">
          Prototype · demo data · nothing is saved or sent
        </p>
      </nav>

      <header className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="text-ink/65">
            Idea {concept.rank} of {16} · scored {concept.score.toFixed(1)} by the panel
          </p>
          <h1 className="mt-2 font-display text-display-l">{concept.title}</h1>
          <p className="mt-2 font-display text-prompt text-ink/70">{concept.subtitle}</p>
          <p className="mt-5 max-w-2xl text-lede text-ink/80">{concept.pitch}</p>
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <p className="mb-2 text-sm text-ink/65">Your verdict</p>
          <div role="radiogroup" aria-label={`Verdict on ${concept.title}`} className="inline-flex rounded-md border border-ink/15 p-1">
            {VERDICTS.map((v) => {
              const on = verdict === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => concept.slug && setVerdict(concept.slug, on ? null : v.value)}
                  className={`h-11 rounded-sm px-4 text-[0.9375rem] transition-colors duration-300 ${ on ? (v.value === "keep" ? "bg-accent text-on-accent" : "bg-ink text-ground") : "text-ink/70 hover:text-ink"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Underlined tabs from sm up; on phones a two-column grid so every screen is in view. */}
      <div
        ref={strip}
        role="tablist"
        aria-label={`${concept.title} screens`}
        onKeyDown={onKey}
        className="rule mt-10 grid grid-cols-2 gap-2 sm:-mx-margin sm:flex sm:gap-1 sm:overflow-x-auto sm:border-b sm:px-margin"
      >
        {screens.map((s, i) => {
          const on = s.id === active;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`screen-tab-${s.id}`}
              aria-selected={on}
              aria-controls={`screen-${s.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(s.id)}
              className={`relative min-h-12 shrink-0 rounded-md px-3 text-left text-[0.9375rem] transition-colors duration-300 max-sm:border sm:whitespace-nowrap sm:rounded-none ${ on ? "font-medium text-ink max-sm:border-ink max-sm:bg-ink max-sm:text-ground"
                  : "text-ink/65 hover:text-ink max-sm:border-ink/15"
              }`}
            >
              <span className={`mr-2 tabular-nums ${on ? "max-sm:text-ground/70 sm:text-ink/45" : "text-ink/45"}`}>{i + 1}</span>
              {s.label}
              <span aria-hidden className={`absolute inset-x-2 -bottom-px hidden h-[2px] rounded-full bg-accent transition-opacity duration-300 sm:block ${on ? "opacity-100" : "opacity-0"}`} />
            </button>
          );
        })}
      </div>

      {screens.map((s) => (
        <div
          key={s.id}
          id={`screen-${s.id}`}
          role="tabpanel"
          aria-labelledby={`screen-tab-${s.id}`}
          hidden={s.id !== active}
          className="pt-8"
        >
          {s.content}
        </div>
      ))}

      <details className="group rule mt-16 border-t pt-6">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-display text-[1.6rem] leading-tight [&::-webkit-details-marker]:hidden">
          How it would work
          <Icon name="arrow-down" className="h-4 w-4 text-ink/50 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="mt-5 grid grid-cols-1 gap-8 text-[0.9375rem] leading-relaxed text-ink/80 lg:grid-cols-2">
          <Note title="The flow">{concept.how}</Note>
          <div className="space-y-8">
            <Note title="The moment people tell a friend about">{concept.wow}</Note>
            <Note title="Who sees what">{concept.privacy}</Note>
            <Note title="Risks the panel raised">{concept.risks}</Note>
          </div>
        </div>
      </details>
    </div>
  );
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-medium text-ink">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
