"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Icon } from "@/components/shared/Icon";
import type { CircleActions, CircleState } from "./CirclesPrototype";
import { CircleGlyph, EASE, LockGlyph, Mood } from "./bits";
import { CIRCLES, SAMPLE, type PageField } from "./data";

const PEOPLE = new Set(CIRCLES.flatMap((c) => c.members)).size;

export function OfferBuilder({ state, actions }: { state: CircleState; actions: CircleActions }) {
  const { fields } = state;
  const [selected, setSelected] = useState("line");
  const field = fields.find((f) => f.id === selected)!;
  const offered = fields.filter((f) => f.offered);
  const kept = fields.filter((f) => !f.offered);

  function update(id: string, patch: Partial<PageField>) {
    actions.setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  return (
    <div>
      <div className="max-w-2xl">
        <h2 className="font-display text-display-m">What they see</h2>
        <p className="mt-2 text-ink/70">
          Every field starts private. Give one a circle and it travels with your seal; the rest never leave your page.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section aria-labelledby="page-fields" className="sheet min-w-0 px-[clamp(1.1rem,4vw,2.5rem)] py-[clamp(1.4rem,4vw,2.25rem)]">
          <div className="rule flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-5">
            <h3 id="page-fields" className="font-display text-[clamp(1.75rem,1.4rem+1.2vw,2.3rem)] leading-none">
              Evening page
            </h3>
            <p className="text-sm text-ink/65">Your template · {fields.length} fields</p>
          </div>

          <ul className="mt-3 space-y-1">
            {fields.map((f) => {
              const on = f.id === selected;
              return (
                <li key={f.id} className={`flex items-center gap-2 rounded-md transition-colors duration-300 ${on ? "bg-ink/[0.05]" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setSelected(f.id)}
                    aria-pressed={on}
                    className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left"
                  >
                    <Icon name={f.icon} className="h-5 w-5 text-ink/65" />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[1.35rem] leading-tight">{f.label}</span>
                      <span className="text-[0.8125rem] text-ink/65">{f.typeLabel}</span>
                    </span>
                  </button>
                  <CircleSwitch field={f} onToggle={() => update(f.id, { offered: !f.offered })} />
                </li>
              );
            })}
          </ul>

          <div className="rule mt-6 border-t pt-6">
            <p className="text-sm text-ink/65">Editing · {field.typeLabel}</p>
            <label htmlFor="field-question" className="mt-3 block text-[0.9375rem] font-medium">
              Question
            </label>
            <input
              id="field-question"
              value={field.label}
              onChange={(e) => update(field.id, { label: e.target.value })}
              className="control mt-2 font-display text-xl "
            />
            <p id="who-label" className="mt-6 text-[0.9375rem] font-medium">
              Who sees the answer
            </p>
            <div role="radiogroup" aria-labelledby="who-label" className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { val: false, title: "Only me", body: "Stays on your page. Kata’s letters never read it.", glyph: <LockGlyph /> },
                { val: true, title: "My circles", body: `Travels with your seal to ${PEOPLE} people.`, glyph: <CircleGlyph /> },
              ].map((o) => {
                const on = field.offered === o.val;
                return (
                  <button
                    key={String(o.val)}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => update(field.id, { offered: o.val })}
                    className={`rounded-md border px-4 py-3 text-left transition-colors duration-300 ${ on ? "border-ink bg-ink/[0.04]" : "border-ink/15 hover:border-ink/40"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {o.glyph}
                      {o.title}
                    </span>
                    <span className="mt-1 block text-sm text-ink/70">{o.body}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside aria-labelledby="they-see" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <h3 id="they-see" className="font-display text-[1.6rem] leading-tight">
            What your circles see
          </h3>
          <p className="mt-1 text-sm text-ink/65">Tonight’s row, live as you change it</p>
          <Preview state={state} offered={offered} />

          <h3 className="mt-8 flex items-center gap-2 font-display text-[1.35rem] leading-tight">
            <LockGlyph className="h-5 w-5 text-ink/65" />
            Stays on your page
          </h3>
          {kept.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {kept.map((f) => (
                <li key={f.id} className="rounded-full border border-ink/15 px-3 py-1.5 text-sm text-ink/75">
                  {f.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink/70">Nothing. Every field is offered.</p>
          )}
          <p className="mt-6 text-sm text-ink/65">
            Once a month Kata reminds you which fields are circle-visible. Leaving a circle takes your lines with you.
          </p>
        </aside>
      </div>
    </div>
  );
}

function CircleSwitch({ field, onToggle }: { field: PageField; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={field.offered}
      aria-label={`Offer “${field.label}” to your circles`}
      onClick={onToggle}
      className="mr-2 inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-1"
    >
      <span className={`text-[0.8125rem] ${field.offered ? "font-medium text-ink" : "text-ink/65"} max-xs:sr-only`}>
        {field.offered ? "Circle" : "Private"}
      </span>
      <span
        aria-hidden
        className={`relative h-[1.625rem] w-11 rounded-full border transition-colors duration-300 ${ field.offered ? "border-ink bg-ink" : "border-ink/25 bg-transparent"
        }`}
      >
        <span
          className={`absolute left-[3px] top-1/2 grid h-[1.125rem] w-[1.125rem] -translate-y-1/2 place-items-center rounded-full transition-transform duration-300 ease-out ${ field.offered ? "translate-x-[1.1rem] bg-ground" : "bg-ink/45"
          }`}
        />
      </span>
    </button>
  );
}

function Preview({ state, offered }: { state: CircleState; offered: PageField[] }) {
  const reduce = useReducedMotion();
  const { me, line, mood } = state;
  const has = (k: string) => offered.some((f) => f.kind === k);
  const lineField = offered.find((f) => f.kind === "line");
  const item = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.35, ease: EASE },
  };

  return (
    <div className="sheet mt-4 px-5 py-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
        <PersonSeal initial={me.initial} size={44} className="mt-0.5 -rotate-6" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{me.first}</span>
            <span className="text-sm text-ink/65">Wednesday · 9:40 pm</span>
            <AnimatePresence initial={false}>
              {has("mood") ? (
                <motion.span key="mood" {...item}>
                  <Mood level={mood} />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </p>
          <AnimatePresence initial={false} mode="popLayout">
            {lineField && line.trim() ? (
              <motion.p key="line" {...item} className="mt-1.5 text-[1.125rem] leading-relaxed">
                {line.trim()}
              </motion.p>
            ) : null}
            {has("long") ? (
              <motion.div key="long" {...item} className="mt-3">
                <p className="text-[0.8125rem] text-ink/65">{offered.find((f) => f.kind === "long")!.label}</p>
                <p className="text-[1rem] leading-relaxed text-ink/85">{SAMPLE.drained}</p>
              </motion.div>
            ) : null}
            {has("promises") ? (
              <motion.ul key="promises" {...item} className="mt-3 space-y-1 text-[0.9375rem]">
                {SAMPLE.promises.map((p) => (
                  <li key={p.text} className="flex items-center gap-2">
                    <Icon name="check" className={`h-4 w-4 ${p.done ? "text-ink" : "text-ink/30"}`} />
                    <span className={p.done ? "" : "text-ink/70"}>{p.text}</span>
                  </li>
                ))}
              </motion.ul>
            ) : null}
            {has("number") ? (
              <motion.p key="number" {...item} className="mt-3 text-[0.9375rem] text-ink/80">
                {SAMPLE.sleep} hours slept
              </motion.p>
            ) : null}
          </AnimatePresence>
          {offered.length === 0 ? (
            <p className="mt-1.5 text-ink/65">Only your seal. They’ll know you wrote, and nothing else.</p>
          ) : null}
        </div>
      </div>
      <p className="rule mt-5 flex items-center gap-2 border-t pt-4 text-sm text-ink/65">
        <CircleGlyph />
        Shared with {PEOPLE} people in {CIRCLES.length} circles
      </p>
    </div>
  );
}
