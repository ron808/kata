"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { YearAlmanac } from "@/components/shared/YearAlmanac";
import { buildAlmanac, exampleYear } from "@/lib/utils/almanac";
import { EASE } from "./bits";
import { MY_COLOPHON, type Leaf } from "./data";

const END = new Date(Date.UTC(2026, 9, 29));

export function ColophonScreen({ me, leaves }: { me: Me; leaves: (Leaf & { cooling?: boolean })[] }) {
  const [view, setView] = useState<"owner" | "visitor">("owner");
  const [openLeaf, setOpenLeaf] = useState<string | null>(leaves[0]?.id ?? null);
  const [visitorNote, setVisitorNote] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const owner = view === "owner";

  // Presence only: a written day is one even square, however long the page was.
  const months = useMemo(
    () =>
      buildAlmanac(exampleYear(END), END).map((m) => ({
        ...m,
        days: m.days.map((d) => ({ ...d, level: d.level > 0 ? (2 as const) : (0 as const) })),
      })),
    []
  );
  const written = months.reduce((n, m) => n + m.days.filter((d) => d.level > 0).length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-ink/65">
          kata.app/<span className="text-ink">@{MY_COLOPHON.handle}</span>
        </p>
        <div role="radiogroup" aria-label="See the colophon" className="inline-flex rounded-md border border-ink/15 p-1">
          {(
            [
              ["owner", "As you"],
              ["visitor", "As a visitor"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => {
                setView(v);
                setVisitorNote(null);
              }}
              className={`h-11 rounded-sm px-4 text-[0.9375rem] transition-colors duration-300 ${ view === v ? "bg-ink text-ground" : "text-ink/70 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* The colophon's title page */}
      <section aria-labelledby="colophon-title" className="sheet relative mt-5 overflow-hidden px-[clamp(1.25rem,5vw,3.5rem)] py-[clamp(1.75rem,5vw,3.25rem)]">
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          <PersonSeal initial="E" size={72} className="-rotate-3" />
          <div className="min-w-0">
            <h2 id="colophon-title" className="font-display text-display-m">
              {MY_COLOPHON.pen}
            </h2>
            <p className="mt-4 max-w-[40rem] text-prose text-ink/85">{MY_COLOPHON.note}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="mt-6"
              >
                {owner ? (
                  <div className="rule flex flex-col gap-1 border-t pt-5 text-[0.9375rem] text-ink/70 sm:flex-row sm:flex-wrap sm:gap-x-6">
                    <p>
                      <span className="font-medium text-ink">Kept on some shelves.</span> Kata doesn’t count them, even for you.
                    </p>
                    <p>Only you can see this pen name is {me.first}.</p>
                  </div>
                ) : (
                  <div className="rule flex flex-wrap items-center gap-3 border-t pt-5">
                    <Button onClick={() => setVisitorNote("Visitors place your book on their shelf here. You’ll never see who did, or how many.")}>
                      Place on my shelf
                    </Button>
                    <Button variant="secondary" onClick={() => setVisitorNote("‘Walk with this’ copies your form and lines their day 1 up beside yours. Your pages stay yours.")}>
                      Walk with this form
                    </Button>
                    {visitorNote ? (
                      <p role="status" className="basis-full text-sm text-ink/70">
                        {visitorNote}
                      </p>
                    ) : null}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12">
        {/* The form */}
        <section aria-labelledby="form-title" className="lg:col-span-5">
          <h2 id="form-title" className="font-display text-[1.75rem] leading-tight">
            The form I write in
          </h2>
          <div className="sheet mt-4 p-6">
            <p className="font-display text-[1.6rem] leading-tight">{MY_COLOPHON.form.name}</p>
            <ol className="mt-4 space-y-2.5">
              {MY_COLOPHON.form.fields.map((f, i) => (
                <li key={f} className="flex gap-3 font-display text-[1.1rem] leading-snug text-ink/80">
                  <span className="w-4 shrink-0 font-sans text-sm not-italic tabular-nums text-ink/65">{i + 1}</span>
                  {f}
                </li>
              ))}
            </ol>
            <p className="rule mt-5 border-t pt-4 text-sm text-ink/65">
              {owner ? "Visitors can copy this form. They never see your private pages." : "Copy it to your notebook and start on day 1."}
            </p>
          </div>
        </section>

        {/* Open works */}
        <section aria-labelledby="works-title" className="lg:col-span-7">
          <h2 id="works-title" className="font-display text-[1.75rem] leading-tight">
            Open works
          </h2>
          <p className="mt-1 text-[0.9375rem] text-ink/65">Promises made in public. A seal for each one kept.</p>
          <ul className="rule mt-4 divide-y divide-ink/10 border-y">
            {MY_COLOPHON.openWorks.map((w) => {
              const done = w.done === w.of;
              return (
                <li key={w.id} className="py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display text-[1.35rem] leading-tight">{w.title}</h3>
                    <p className={`text-sm ${done ? "font-medium text-ok" : "text-ink/65"}`}>
                      {done ? `Kept · all ${w.of} ${w.unit}` : `${w.done} of ${w.of} ${w.unit}`}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5" role="img" aria-label={`${w.done} of ${w.of} sealed`}>
                    {Array.from({ length: w.of }, (_, i) => (
                      <PersonSeal key={i} initial="E" size={22} state={i < w.done ? "inked" : "blank"} />
                    ))}
                  </div>
                  <p className="mt-2.5 text-[1.0625rem] text-ink/75">{w.note}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Year of ink */}
      <section aria-labelledby="ink-title" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="ink-title" className="font-display text-[1.75rem] leading-tight">
            A year of ink
          </h2>
          <p className="text-sm text-ink/65">Which days, never what time or how much · {written} days written</p>
        </div>
        <YearAlmanac months={months} label={`Written on ${written} days in the past year`} className="mt-5" />
      </section>

      {/* What they've published */}
      <section aria-labelledby="published-title" className="rule mt-14 border-t pt-10">
        <h2 id="published-title" className="font-display text-display-m">
          On this shelf
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h3 className="text-[0.9375rem] font-medium">Volumes</h3>
            <ul className="mt-4 grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-1">
              {MY_COLOPHON.volumes.map((v, i) => (
                <li key={v.id} className={`${i === 0 ? "chapter" : "bg-raised"} rounded-xs p-5 shadow-paper`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-[1.5rem] leading-tight">{v.title}</p>
                    <Seal size={26} cut={i === 0 ? "ground" : "raised"} className="mt-1 -rotate-6" title="Title pages set by Kata" />
                  </div>
                  <p className="mt-1 text-sm text-ink/65">{v.leaves} leaves · a chapter each month</p>
                  <ol className="mt-4 space-y-1 text-[1rem] text-ink/80">
                    {v.chapters.map((ch) => (
                      <li key={ch}>{ch}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <h3 className="text-[0.9375rem] font-medium">Leaves</h3>
            <ul className="rule mt-4 divide-y divide-ink/10 border-y">
              {leaves.filter((l) => owner || !l.cooling).map((l) => {
                const open = openLeaf === l.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`leaf-${l.id}`}
                      onClick={() => setOpenLeaf(open ? null : l.id)}
                      className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-[1.4rem] leading-tight">{l.title}</span>
                        <span className="text-sm text-ink/65">
                          {l.date}
                          {l.cooling ? " · cooling, goes up tomorrow" : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        {l.cooling !== undefined ? (
                          <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[0.8125rem] text-ink/70">
                            {l.cooling ? "Only you, for now" : "New"}
                          </span>
                        ) : null}
                        <Icon name="arrow-down" className={`h-4 w-4 text-ink/60 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div
                          id={`leaf-${l.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35, ease: EASE }}
                        >
                          <p className="max-w-[38rem] pb-5 text-prose text-ink/85">{l.body}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
