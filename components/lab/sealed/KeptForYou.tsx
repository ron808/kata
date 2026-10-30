"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { FieldPrompt } from "@/components/entry/FieldPrompt";
import { Button } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import type { Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { EASE, MIRA, MIRA_TOTAL, TODAY, countdown, dayMonth, shortDate } from "./data";

export function KeptForYou({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [mine, setMine] = useState(MIRA.mine.map((m, i) => ({ ...m, id: `m${i}`, fresh: false })));
  const [kept, setKept] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const myCount = mine.length + kept.length;
  const fromPages = MIRA.fromPages.filter((p) => kept.includes(p.id)).map((p) => ({ ...p, fresh: true, fromPage: true }));
  const list = [...fromPages, ...mine.map((m) => ({ ...m, fromPage: false }))].sort((a, b) => (a.fresh === b.fresh ? 0 : a.fresh ? -1 : 1));
  const total = MIRA_TOTAL - MIRA.mine.length + myCount;
  const keepers = [{ id: "me", initial: me.initial, name: `${me.first} (you)` }, ...MIRA.keepers];

  function add(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMine((m) => [{ id: `n${m.length}`, date: TODAY, text, fresh: true }, ...m]);
    setDraft("");
  }

  const toggle = (id: string) => setKept((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-12">
      <aside aria-label="The book Mira will open" className="lg:order-2 lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          <div className="relative isolate">
            {/* Page edges under the cover: it is a book, not a card. */}
            <span aria-hidden className="absolute inset-x-1.5 -bottom-2 top-2 rounded-xs bg-surface shadow-paper" />
            <span aria-hidden className="absolute inset-x-3 -bottom-3.5 top-3 -z-10 rounded-xs bg-[color-mix(in_oklab,var(--surface)_80%,var(--raised))] shadow-paper" />
            <div className="chapter relative overflow-hidden rounded-xs py-[clamp(1.5rem,4vw,2.5rem)] pl-[calc(clamp(1.5rem,4vw,2.5rem)+0.75rem)] pr-[clamp(1.5rem,4vw,2.5rem)] shadow-paper">
              <span aria-hidden className="absolute inset-y-0 left-0 w-3 border-r border-ink/10 bg-ink/[0.05]" />
              <p className="text-sm text-ink/65">Kept for you · a bound book</p>
              <p className="mt-3 font-display text-[clamp(2.4rem,1.9rem+2vw,3.4rem)] leading-[0.95]">
                For Mira,
                <span className="block ">at thirty.</span>
              </p>
              <ul aria-label="Keepers" className="mt-7 flex flex-wrap gap-1.5">
                {keepers.map((k) => (
                  <li key={k.id}>
                    <PersonSeal initial={k.initial} size={30} title={k.name} />
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-[2.6rem] leading-none tabular-nums" aria-live="polite">
                    <motion.span
                      key={total}
                      className="inline-block"
                      // Only animate once the count changes, so the server and client first renders match.
                    initial={total !== MIRA_TOTAL && !reduce ? { opacity: 0, y: -10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                    >
                      {total}
                    </motion.span>
                    <span className="ml-2 text-[1.1rem] text-ink/70">memories</span>
                  </p>
                  <p className="mt-2 text-sm text-ink/70">
                    8 keepers · {countdown(MIRA.opens)}, {dayMonth(MIRA.opens)}
                  </p>
                </div>
                <Seal size={48} cut="ground" className="-rotate-6" />
              </div>
            </div>
          </div>
          <p className="mt-8 text-[0.9375rem] leading-relaxed text-ink/70">
            The night before, Kata asks every keeper to read theirs once more. Nobody sees anyone else’s until Mira does, and she can choose to open it alone.
          </p>
        </div>
      </aside>

      <div className="lg:order-1 lg:col-span-7">
        <h2 className="font-display text-display-m">Mira turns thirty on {dayMonth(MIRA.opens)}.</h2>
        <p className="mt-3 max-w-xl text-ink/70">
          Eight of you have been keeping things for her all year. You can see who has added, never what. She’ll open them together, each one signed with its keeper’s seal.
        </p>

        <form onSubmit={add} className="sheet mt-9 px-[clamp(1.25rem,4vw,2rem)] pb-5 pt-6">
          <FieldPrompt htmlFor="keep-draft">What do you want her to have?</FieldPrompt>
          <textarea
            id="keep-draft"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A night, a habit, a thing she said…"
            className="writing ruled mt-2 block"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/65">Only you can read this until {dayMonth(MIRA.opens)}.</p>
            <Button type="submit" disabled={!draft.trim()}>
              Keep it for Mira
            </Button>
          </div>
        </form>

        <section aria-labelledby="from-pages" className="mt-12">
          <h3 id="from-pages" className="text-[0.9375rem] font-medium">
            From your pages
          </h3>
          <p className="mt-1 text-sm text-ink/65">Kata noticed Mira in these. Keep a passage and it goes into the book as you wrote it.</p>
          <ul className="rule mt-4 divide-y divide-ink/10 border-y">
            {MIRA.fromPages.map((p) => {
              const on = kept.includes(p.id);
              return (
                <li key={p.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="text-sm text-ink/65">{shortDate(p.date)}</p>
                    <p className="mt-1 text-lg leading-relaxed text-ink/90">{p.text}</p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(p.id)}
                    className={`inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full border pl-1.5 pr-4 text-[0.9375rem] transition-colors duration-300 ${ on ? "border-ink/80 bg-ink/[0.06] text-ink" : "border-ink/15 text-ink/75 hover:border-ink/40 hover:text-ink"
                    }`}
                  >
                    <PersonSeal initial={me.initial} size={30} state={on ? "inked" : "blank"} />
                    {on ? "Kept for Mira" : "Keep for Mira"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="yours" className="mt-12">
          <h3 id="yours" className="flex items-baseline justify-between gap-4 text-[0.9375rem] font-medium">
            Yours so far
            <span className="text-sm font-normal text-ink/65">{myCount} kept</span>
          </h3>
          <ol className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {list.map((m) => (
                <motion.li
                  key={m.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex gap-4 rounded-xs bg-surface px-4 py-3.5"
                >
                  <motion.span
                    className="mt-0.5 inline-block"
                    initial={m.fresh && !reduce ? { scale: 1.8, rotate: -24, opacity: 0 } : false}
                    animate={{ scale: 1, rotate: -6, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                  >
                    <PersonSeal initial={me.initial} size={28} />
                  </motion.span>
                  <div className="min-w-0">
                    <p className="text-[1.0625rem] leading-relaxed text-ink/90">{m.text}</p>
                    <p className="mt-1 text-[0.8125rem] text-ink/65">
                      {m.fromPage ? `From your page of ${shortDate(m.date)}` : m.date === TODAY ? "Just now" : shortDate(m.date)}
                    </p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </section>

        <section aria-labelledby="others" className="mt-12">
          <h3 id="others" className="text-[0.9375rem] font-medium">
            The other keepers
          </h3>
          <p className="mt-1 text-sm text-ink/65">A seal appears when someone adds. What they wrote stays folded.</p>
          <ul className="rule mt-4 divide-y divide-ink/10 border-y">
            {MIRA.keepers.map((k) => (
              <li key={k.id} className="flex items-center gap-4 py-3.5">
                <PersonSeal initial={k.initial} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-medium">{k.name}</p>
                  <p className="text-sm text-ink/65">
                    {k.count} kept · last {k.last}
                  </p>
                </div>
                <span aria-hidden className="hidden max-w-[11rem] flex-wrap justify-end gap-1 xs:flex">
                  {Array.from({ length: k.count }, (_, i) => (
                    <span key={i} className="h-4 w-3 rounded-[2px] border border-ink/20 bg-ink/[0.05]" />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
