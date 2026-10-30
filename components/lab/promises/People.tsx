"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CAST, person } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { EASE } from "./HoldSeal";

/** Choose one to three named people. Never a broadcast. */
export function PeoplePicker({
  chosen,
  onChange,
  max = 3,
  label,
  exclude = [],
}: {
  chosen: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  label: string;
  exclude?: string[];
}) {
  const full = chosen.length >= max;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {CAST.filter((p) => !exclude.includes(p.id)).map((p) => {
        const on = chosen.includes(p.id);
        const off = !on && full;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={on}
              disabled={off}
              onClick={() => onChange(on ? chosen.filter((x) => x !== p.id) : [...chosen, p.id])}
              className={`inline-flex h-11 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-[0.9375rem] transition-colors duration-300 disabled:opacity-45 ${ on ? "border-ink/45 bg-ink/[0.06] text-ink" : "border-ink/15 text-ink/75 hover:border-ink/35 hover:text-ink"
              }`}
            >
              <PersonSeal initial={p.initial} size={30} state={on ? "inked" : "blank"} />
              {p.first}
              {p.id === "nani" ? <span className="text-sm text-ink/65">by email</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export interface Signer {
  initial: string;
  name: string;
  inked: boolean;
  /** A short line under the name once sealed: "from Lisbon". */
  note?: string;
}

export const signersFor = (ids: string[]) =>
  ids.map((id) => {
    const p = person(id);
    return { initial: p.initial, name: p.first };
  });

export const names = (list: string[]) =>
  list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;

/** A kept promise as it sits in your history: like a signed document. */
export function SignedCard({
  text,
  day,
  carried,
  signers,
  animate = true,
}: {
  text: string;
  day: string;
  carried: number;
  signers: Signer[];
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  const others = signers.slice(1);
  const waiting = others.filter((s) => !s.inked).map((s) => s.name);
  return (
    <motion.figure
      initial={animate ? (reduce ? { opacity: 0 } : { opacity: 0, y: 16 }) : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.1, ease: EASE }}
      className="sheet relative overflow-clip px-[clamp(1.25rem,4vw,2.5rem)] pb-7 pt-6"
    >
      <p className="text-sm text-ink/65">Kept · {day}</p>
      <blockquote className="mt-3 font-display text-[clamp(1.7rem,1.3rem+1.6vw,2.4rem)] leading-[1.05]">{text}</blockquote>
      <figcaption className="mt-3 text-[0.9375rem] text-ink/70" aria-live="polite">
        {carried ? `Carried ${carried === 1 ? "once" : carried === 2 ? "twice" : `${carried} times`}, then kept. ` : "Kept the day it was written. "}
        {others.length
          ? waiting.length
            ? `The card is with ${names(waiting)}.`
            : `Witnessed by ${names(others.map((s) => s.name))}.`
          : ""}
      </figcaption>
      <ul aria-label="Seals" className="mt-6 grid grid-cols-3 gap-[clamp(0.75rem,3vw,2rem)]">
        {signers.map((s, i) => (
          <li key={s.name + i} className="min-w-0">
            {/* The seal is pressed onto the signature line, the way a hanko overlaps a name. */}
            <div className="relative h-[3.75rem]">
              <span aria-hidden className="rule absolute inset-x-0 bottom-3 border-t" />
              <span className={`absolute bottom-0 left-1 inline-block ${i % 2 ? "rotate-[5deg]" : "-rotate-[7deg]"}`}>
                <AnimatePresence initial={false} mode="popLayout">
                  {s.inked ? (
                    <motion.span
                      key="inked"
                      className="block"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.9, rotate: -24 }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                    >
                      <PersonSeal initial={s.initial} size={52} className="bg-surface" title={`${s.name}’s seal`} />
                    </motion.span>
                  ) : (
                    <motion.span key="blank" className="block" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <PersonSeal initial={s.initial} size={52} state="blank" className="bg-surface" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </div>
            <p className="mt-1.5 truncate text-sm text-ink/80">{s.name}</p>
            <p className="truncate text-sm text-ink/65">{s.inked ? (s.note ?? "Sealed") : "Not yet"}</p>
          </li>
        ))}
      </ul>
    </motion.figure>
  );
}
