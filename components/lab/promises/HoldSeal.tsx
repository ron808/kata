"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";

export const EASE = [0.22, 1, 0.36, 1] as const;
const HOLD_MS = 700;

/**
 * Press and hold to stamp a seal. While held, ink spreads inside the empty frame;
 * let go early and it recedes. Works with a pointer, a finger, or Space / Enter held.
 */
export function HoldSeal({
  initial,
  label,
  sealed,
  onSeal,
  size = 40,
  hint,
}: {
  initial: string;
  /** What holding does, for assistive tech: "Hold to keep: Call Nani". */
  label: string;
  sealed: boolean;
  onSeal: () => void;
  size?: number;
  /** Visible words beside the seal while it is empty. */
  hint?: string;
}) {
  const reduce = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function start() {
    if (sealed || timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(14);
      onSeal();
    }, HOLD_MS);
  }

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      start();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key === " " || e.key === "Enter") stop();
  }

  const box = Math.max(44, size + 8);

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label={sealed ? `${label}. Sealed` : label}
        aria-disabled={sealed || undefined}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={stop}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative grid shrink-0 touch-none select-none place-items-center rounded-md [-webkit-touch-callout:none] ${ sealed ? "cursor-default" : "cursor-pointer hover:bg-ink/[0.04]"
        }`}
        style={{ width: box, height: box }}
      >
        <span className="relative grid place-items-center" style={{ width: size, height: size }}>
          {/* The empty frame, and the ink that spreads in it while held. */}
          <span
            aria-hidden
            className={`absolute inset-0 rounded-[22%] border-dashed border-ink/35 transition-opacity duration-300 ${sealed ? "opacity-0" : "opacity-100"}`}
            style={{ borderWidth: Math.max(1.5, size * 0.06) }}
          />
          {/* Your initial, uninked: it reads as your seal waiting, not a checkbox. */}
          <span
            aria-hidden
            className={`absolute inset-0 grid place-items-center font-display leading-none text-ink/25 transition-opacity duration-300 ${sealed ? "opacity-0" : "opacity-100"}`}
            style={{ fontSize: size * 0.58 }}
          >
            <span className="translate-y-[0.04em]">{initial}</span>
          </span>
          <span
            aria-hidden
            className="absolute inset-[12%] rounded-[18%] bg-accent/30"
            style={{
              transform: `scale(${holding ? 1 : 0})`,
              transition: holding
                ? `transform ${HOLD_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
          <AnimatePresence initial={false}>
            {sealed ? (
              <motion.span
                key="ink"
                className="absolute inset-0 grid place-items-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -28 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -7 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <PersonSeal initial={initial} size={size} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </button>
      {hint && !sealed ? <span className="text-sm text-ink/65">{hint}</span> : null}
    </span>
  );
}
