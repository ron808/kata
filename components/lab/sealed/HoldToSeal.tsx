"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

export const HOLD_MS = 1100;

/**
 * The one primary action on the seal sheet: press and hold, like leaning on a hanko.
 * Pointer and keyboard (Space / Enter held) both work. Letting go early cancels.
 */
export function HoldToSeal({
  holding,
  onHoldChange,
  onSealed,
  disabled,
  describedBy,
}: {
  holding: boolean;
  onHoldChange: (h: boolean) => void;
  onSealed: () => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function start() {
    if (disabled || timer.current) return;
    onHoldChange(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      onHoldChange(false);
      onSealed();
    }, HOLD_MS);
  }

  function stop() {
    if (!timer.current) return;
    window.clearTimeout(timer.current);
    timer.current = undefined;
    onHoldChange(false);
  }

  const isKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-describedby={describedBy}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (!isKey(e)) return;
        e.preventDefault();
        if (!e.repeat) start();
      }}
      onKeyUp={(e) => isKey(e) && stop()}
      onBlur={stop}
      className="relative isolate flex h-14 w-full touch-none select-none items-center justify-center overflow-hidden rounded-md bg-accent px-5 text-base font-medium text-on-accent transition-transform duration-300 ease-out active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
    >
      <span
        aria-hidden
        className="absolute inset-0 -z-10 origin-left bg-[color-mix(in_oklab,var(--accent)_72%,var(--ink))]"
        style={{
          transform: `scaleX(${holding ? 1 : 0})`,
          transition: `transform ${holding ? HOLD_MS : 300}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      />
      {holding ? "Keep holding…" : "Press and hold to seal"}
    </button>
  );
}
