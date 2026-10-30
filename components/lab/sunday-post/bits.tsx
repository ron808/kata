"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { DAYS, type Motif } from "./data";

export const EASE = [0.22, 1, 0.36, 1] as const;

// ── Press and hold ───────────────────────────────────────────────────────────

/**
 * Press and hold for `ms` to fire `onDone`. A keyboard press (Enter or Space) fires at
 * once, so holding is never the only way through.
 */
export function useHold(ms: number, onDone: () => void) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }, []);

  const bind = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setHolding(true);
      timer.current = setTimeout(() => {
        timer.current = null;
        setHolding(false);
        done.current();
      }, ms);
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onClick(e: MouseEvent<HTMLElement>) {
      if (e.detail === 0) done.current();
    },
    onContextMenu(e: MouseEvent<HTMLElement>) {
      e.preventDefault();
    },
  };
  return { holding, bind };
}

// ── Stamps and postmarks ─────────────────────────────────────────────────────

const MOTIFS: Record<Motif, string> = {
  tram: "M5 16.5h14M6.5 16.5V9a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7.5M6.5 11.5h11M9 7l-1.5-3M15 7l1.5-3M9 19.5l.8-3M15 19.5l-.8-3M9 14h.01M15 14h.01",
  flower: "M12 20v-6M12 14c-3 0-4-3-4-5a4 4 0 0 1 8 0c0 2-1 5-4 5zM10 8.5a2 2 0 0 1 4 0M9.5 17.5c-1.5-.5-3-1.8-3-3.5 1.7 0 3 1 3.5 2M14.5 17.5c1.5-.5 3-1.8 3-3.5-1.7 0-3 1-3.5 2",
  pine: "M12 3.5l-4.5 6h2.5l-4 5h3l-3.5 4.5h13L15 14.5h3l-4-5h2.5zM12 19v2",
  sun: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 3.5v2M12 18.5v2M5 12H3.5M20.5 12H19M6.6 6.6 5.5 5.5M18.5 18.5l-1.1-1.1M6.6 17.4l-1.1 1.1M18.5 5.5l-1.1 1.1",
  pot: "M4.5 11h15l-1.5 7a2 2 0 0 1-2 1.5H8a2 2 0 0 1-2-1.5zM3 11h18M9.5 8c0-1.2 1-1.5 1-2.7M13.5 8c0-1.2 1-1.5 1-2.7",
};

/** A perforated stamp. Width and height should be multiples of 8 so the perforations close. */
export function Stamp({
  motif,
  w = 48,
  h = 56,
  on = "surface",
  className = "",
}: {
  motif: Motif;
  w?: number;
  h?: number;
  /** The paper the stamp is stuck to; the perforations are cut in its colour. */
  on?: "surface" | "ground";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 ${className}`}
      style={{
        width: w,
        height: h,
        backgroundColor: "var(--raised)",
        backgroundImage: `radial-gradient(circle, var(--${on}) 2.2px, transparent 2.7px)`,
        backgroundSize: "8px 8px",
        backgroundPosition: "-4px -4px",
      }}
    >
      <span className="absolute inset-[4px] grid place-items-center border border-ink/20 bg-raised text-ink/75">
        <svg viewBox="0 0 24 24" width={w * 0.52} height={w * 0.52} fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
          <path d={MOTIFS[motif]} />
        </svg>
      </span>
    </span>
  );
}

/** A circular postmark with wavy cancellation lines. Decorative: say the city and date in text too. */
export function Postmark({ city, date, size = 64, className = "" }: { city: string; date: string; size?: number; className?: string }) {
  const id = `pm-${city}-${date}`.replace(/\W/g, "");
  return (
    <svg aria-hidden viewBox="0 0 140 64" width={size * 2.2} height={size} className={`pointer-events-none text-ink/55 ${className}`} fill="none" stroke="currentColor">
      <defs>
        <path id={id} d="M10 32a22 22 0 1 1 44 0a22 22 0 1 1 -44 0" />
      </defs>
      <circle cx="32" cy="32" r="29" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="16" strokeWidth="1" />
      <text fill="currentColor" stroke="none" fontSize="8.2" letterSpacing="1.2" fontFamily="var(--font-sans)">
        <textPath href={`#${id}`} startOffset="2%">
          {city.toUpperCase()} · {city.toUpperCase()} ·
        </textPath>
      </text>
      <text x="32" y="35" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8.5" fontFamily="var(--font-sans)">
        {date.toUpperCase()}
      </text>
      {[22, 30, 38].map((y) => (
        <path key={y} d={`M64 ${y}c8-5 14 5 22 0s14 5 22 0 14 5 22 0`} strokeWidth="1.3" />
      ))}
    </svg>
  );
}

// ── Mood strip ───────────────────────────────────────────────────────────────

export function MoodStrip({ mood, className = "" }: { mood: number[]; className?: string }) {
  return (
    <div className={className}>
      <ul aria-label="The week in mood" className="flex h-12 items-end gap-1.5">
        {mood.map((m, i) => (
          <li key={i} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="sr-only">
              {DAYS[i]}: {m} of 5
            </span>
            <span aria-hidden className="block w-full max-w-3 rounded-[2px] bg-ink/55" style={{ height: `${18 + m * 16}%` }} />
          </li>
        ))}
      </ul>
      <div aria-hidden className="mt-1.5 flex gap-1.5 text-[0.8125rem] text-ink/65">
        {DAYS.map((d, i) => (
          <span key={i} className="flex-1 text-center">
            {d[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── A person's seal, whole or broken ─────────────────────────────────────────

export function BrokenSeal({ initial, size }: { initial: string; size: number }) {
  return (
    <span aria-hidden className="relative inline-block" style={{ width: size, height: size }}>
      <span className="absolute inset-0 -translate-x-[3px] -rotate-[9deg]" style={{ clipPath: "polygon(0 0, 56% 0, 44% 100%, 0 100%)" }}>
        <PersonSeal initial={initial} size={size} />
      </span>
      <span className="absolute inset-0 translate-x-[3px] translate-y-[2px] rotate-[7deg]" style={{ clipPath: "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)" }}>
        <PersonSeal initial={initial} size={size} />
      </span>
    </span>
  );
}

/** The break itself: two halves of the seal fall away. */
export function BreakingSeal({ initial, size }: { initial: string; size: number }) {
  const reduce = useReducedMotion();
  const t = { duration: reduce ? 0 : 0.6, ease: EASE };
  return (
    <span aria-hidden className="relative inline-block" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0"
        style={{ clipPath: "polygon(0 0, 56% 0, 44% 100%, 0 100%)" }}
        initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
        animate={{ x: -size * 0.5, y: size * 0.35, rotate: -24, opacity: 0 }}
        transition={t}
      >
        <PersonSeal initial={initial} size={size} />
      </motion.span>
      <motion.span
        className="absolute inset-0"
        style={{ clipPath: "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)" }}
        initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
        animate={{ x: size * 0.5, y: size * 0.4, rotate: 20, opacity: 0 }}
        transition={t}
      >
        <PersonSeal initial={initial} size={size} />
      </motion.span>
    </span>
  );
}

// ── Small pieces of interface ────────────────────────────────────────────────

export function ScreenIntro({ title, lede, aside }: { title: string; lede: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        <h2 className="font-display text-[clamp(2rem,1.6rem+1.6vw,2.9rem)] leading-none">{title}</h2>
        <p className="mt-3 text-ink/70">{lede}</p>
      </div>
      {aside}
    </header>
  );
}

/** A row of pill choices backed by real radio inputs. */
export function ChoiceChips<T extends string>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  disabled,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="font-medium text-ink">{legend}</legend>
      {hint ? <p className="mt-1 text-sm text-ink/65">{hint}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="relative cursor-pointer has-[:disabled]:cursor-not-allowed">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <span className="inline-flex min-h-11 items-center rounded-full border border-ink/20 px-4 text-[0.9375rem] text-ink/80 transition-colors duration-300 hover:border-ink/45 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
