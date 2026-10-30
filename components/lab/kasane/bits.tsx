"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { EASE } from "./data";

/**
 * Two people's seals pressed over each other: the mark of a Kasane. The frames cross at one
 * corner like two stamps on the same page, and each letter stays clear.
 */
export function JointSeal({
  a,
  b,
  size = 40,
  bState = "inked",
  className = "",
  title,
}: {
  a: string;
  b: string;
  size?: number;
  bState?: "inked" | "blank" | "resting";
  className?: string;
  title?: string;
}) {
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size * 1.85, height: size * 1.28 }}
    >
      <PersonSeal initial={a} size={size} className="absolute left-0 top-0 -rotate-6" />
      <PersonSeal initial={b} size={size} state={bState} className="absolute bottom-0 right-0 rotate-[5deg]" />
    </span>
  );
}

/**
 * The almanac's layered double seal, small enough for a timeline: one stamp per pen, fanned.
 * A Kasane still sealed shows as dashed frames.
 */
export function DoubleMark({ pens = 2, dashed = false }: { pens?: number; dashed?: boolean }) {
  const n = Math.min(pens, 3);
  const turns = [-9, 6, -2];
  return (
    <span aria-hidden className="relative block" style={{ width: 10 + (n - 1) * 5, height: 12 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className={`absolute top-[1px] h-[10px] w-[10px] rounded-[2.5px] ${ dashed ? "border border-dashed border-ink/50"
              : i === n - 1
                ? "bg-accent"
                : "border-[1.5px] border-accent"
          }`}
          style={{ left: i * 5, transform: `rotate(${turns[i]}deg)` }}
        />
      ))}
    </span>
  );
}

/** True at the lg breakpoint and up. False during the server render. */
export function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 1024px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

/** Text that stays sealed: shape kept, letters swapped, so nothing can be read early. */
export function scramble(text: string) {
  // Weighted toward common letters so the shapes read like real words, not a pattern.
  const pool = "eeeeeeetttttaaaaooooiiiinnnnsssshhhrrrddllluucmmwffyyggppbbvk";
  let n = 2463534242;
  return text.replace(/[a-z]/gi, (ch) => {
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    const c = pool[(n >>> 0) % pool.length];
    return ch === ch.toUpperCase() ? c.toUpperCase() : c;
  });
}

const HOLD_MS = 900;

/**
 * Press and hold your own seal to seal your side. Works with a pointer (hold) and with the
 * keyboard (hold Space or Enter). Releasing early leaves the page as it was.
 */
export function HoldSeal({
  initial,
  sealed,
  onSeal,
  label,
}: {
  initial: string;
  sealed: boolean;
  onSeal: () => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);
  const fill = useTransform(progress, [0, 1], [0.2, 1]);
  const fillOpacity = useTransform(progress, [0, 0.05, 1], [0, 0.18, 0.28]);
  const anim = useRef<ReturnType<typeof animate> | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  function begin() {
    if (sealed || anim.current) return;
    setHint(null);
    anim.current = animate(progress, 1, {
      duration: HOLD_MS / 1000,
      ease: "linear",
      onComplete: () => {
        anim.current = null;
        onSeal();
      },
    });
  }

  function cancel() {
    if (!anim.current) return;
    const p = progress.get();
    anim.current.stop();
    anim.current = null;
    if (p < 1) {
      setHint("Keep holding until the ink takes");
      animate(progress, 0, { duration: reduce ? 0 : 0.3, ease: EASE });
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) begin();
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    cancel();
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label={label}
        aria-disabled={sealed}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          begin();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={cancel}
        onContextMenu={(e) => e.preventDefault()}
        className="relative grid h-[4.75rem] w-[4.75rem] shrink-0 touch-none select-none place-items-center rounded-md [-webkit-touch-callout:none]"
      >
        {sealed ? (
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -28 }}
            animate={{ opacity: 1, scale: 1, rotate: -7 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="inline-block"
          >
            <PersonSeal initial={initial} size={60} />
          </motion.span>
        ) : (
          <span className="relative inline-grid place-items-center">
            <motion.span
              aria-hidden
              style={{ scale: fill, opacity: fillOpacity }}
              className="absolute h-[60px] w-[60px] rounded-[22%] bg-accent"
            />
            <PersonSeal initial={initial} size={60} state="blank" />
          </span>
        )}
      </button>
      <div className="min-w-0" aria-live="polite">
        {sealed ? (
          <p className="font-medium">Sealed with your seal</p>
        ) : (
          <>
            <p className="font-medium">Press and hold your seal</p>
            <p className="text-sm text-ink/65">{hint ?? "Or hold Space. Your side locks once it’s sealed."}</p>
          </>
        )}
      </div>
    </div>
  );
}

export { showLabScreen as goToScreen } from "@/components/lab/LabFrame";

export function listNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
