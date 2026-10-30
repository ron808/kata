"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { MILESTONES, PROPOSED, RINGS_YEARS, type Ring } from "./data";
import { EASE } from "./Pressed";

const C = 130;
const R0 = 34;
const STEP = 21;

/** Rings grow unevenly, like wood: a slow wobble per year, fixed so it never shifts. */
function radiusAt(ring: number, deg: number) {
  const t = (deg * Math.PI) / 180;
  const k = ring + 1;
  return R0 + ring * STEP + 1.6 * Math.sin(3 * t + k * 1.3) + 0.9 * Math.sin(5 * t + k * 2.1) + 0.5 * Math.sin(2 * t + k);
}

function ringPath(ring: number) {
  let d = "";
  for (let deg = 0; deg < 360; deg += 4) {
    const r = radiusAt(ring, deg);
    const a = ((deg - 90) * Math.PI) / 180;
    d += `${deg === 0 ? "M" : "L"}${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

const PATHS = RINGS_YEARS.map((_, i) => ringPath(i));

function point(r: Ring) {
  const radius = radiusAt(r.ring, r.angle);
  const a = ((r.angle - 90) * Math.PI) / 180;
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) };
}

/** A private ring diagram: one ring per year, a mark for each milestone you kept. */
export function TreeRings() {
  const reduce = useReducedMotion();
  const [proposal, setProposal] = useState<"open" | "kept" | "dismissed">("open");
  const [focus, setFocus] = useState("berlin");
  const marks = proposal === "kept" ? [...MILESTONES, PROPOSED] : MILESTONES;

  return (
    <aside aria-labelledby="pf-rings-title" className="space-y-6 lg:pt-4">
      <div>
        <h2 id="pf-rings-title" className="font-display text-[1.6rem] leading-tight">
          Your rings
        </h2>
        <p className="mt-1 text-[0.9375rem] text-ink/70">One ring a year. Each mark is a page that changed you. Only you see this.</p>
      </div>

      <svg viewBox="0 -14 260 274" className="mx-auto block w-full max-w-[17rem] text-ink" role="img" aria-label="Tree rings, 2022 to 2026, with five milestones">
        {/* Heartwood, then one ring a year. Fine late-wood lines sit just inside each ring. */}
        <circle cx={C} cy={C} r={R0 - 8} fill="currentColor" opacity="0.04" />
        {RINGS_YEARS.map((y, i) => (
          <g key={y}>
            <path d={PATHS[i]} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={0.6} transform={`translate(${C} ${C}) scale(0.93) translate(${-C} ${-C})`} />
            <path d={PATHS[i]} fill="none" stroke="currentColor" strokeOpacity={0.16 + i * 0.04} strokeWidth={i === RINGS_YEARS.length - 1 ? 1.6 : 1} />
          </g>
        ))}
        <circle cx={C} cy={C} r={3} fill="currentColor" opacity="0.35" />
        {marks.map((m) => {
          const { x, y } = point(m);
          const on = m.id === focus;
          return (
            <g key={m.id}>
              {on ? <circle cx={x} cy={y} r={10} fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /> : null}
              <circle cx={x} cy={y} r={on ? 5.5 : 4.5} fill="currentColor" opacity={on ? 0.95 : 0.6} />
            </g>
          );
        })}
        {proposal === "open" ? (
          <circle cx={point(PROPOSED).x} cy={point(PROPOSED).y} r={4.5} fill="none" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1.2" opacity="0.7" />
        ) : null}
        <text x={C} y={C - R0 - (RINGS_YEARS.length - 1) * STEP - 6} textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.7">
          2026
        </text>
        <text x={C} y={C - R0 + 16} textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.7">
          2022
        </text>
      </svg>
      <p aria-live="polite" className="-mt-2 text-center font-display text-[1.2rem] leading-tight text-ink/80">
        {marks.find((m) => m.id === focus)?.label} <span className="font-sans text-sm not-italic text-ink/65">· {marks.find((m) => m.id === focus)?.date}</span>
      </p>

      <ul className="rule divide-y divide-ink/10 border-y">
        {marks.map((m) => {
          const on = m.id === focus;
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setFocus(m.id)}
                className={`flex min-h-12 w-full items-center justify-between gap-3 px-2 py-2 text-left transition-colors duration-300 ${ on ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
                }`}
              >
                <span className="text-[0.9375rem]">{m.label}</span>
                <span className="shrink-0 text-sm text-ink/65">{m.date}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence mode="wait" initial={false}>
        {proposal === "open" ? (
          <motion.section
            key="proposal"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            aria-labelledby="pf-proposal"
            className="rounded-xs border border-dashed border-ink/25 p-4"
          >
            <p className="text-sm text-ink/65">Kata noticed a page from September</p>
            <p id="pf-proposal" className="mt-1 font-display text-[1.3rem] leading-snug">
              “{PROPOSED.label}.” A milestone?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => {
                  setProposal("kept");
                  setFocus(PROPOSED.id);
                }}>
                Keep it
              </Button>
              <Button variant="quiet" onClick={() => setProposal("dismissed")}>
                Not one
              </Button>
            </div>
          </motion.section>
        ) : (
          <motion.p
            key="done"
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="text-[0.9375rem] text-ink/70"
          >
            {proposal === "kept"
              ? "Kept. It comes back next September with the question you answered."
              : "Fine. Kata only ever proposes. Nothing becomes a milestone without you."}
          </motion.p>
        )}
      </AnimatePresence>
    </aside>
  );
}
