"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";

const HOLD_MS = 900;

/**
 * Press and hold your own seal to seal tonight's page. Pointer, Space or Enter all hold;
 * an assistive-tech click (no pointer, no key) seals at once.
 */
export function HoldSeal({ initial, onSealed, disabled }: { initial: string; onSealed: () => void; disabled?: boolean }) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const viaKey = useRef(false);

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  function begin() {
    if (disabled || start.current !== null) return;
    start.current = performance.now();
    const tick = (t: number) => {
      if (start.current === null) return;
      const p = Math.min(1, (t - start.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        start.current = null;
        onSealed();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  function cancel() {
    if (start.current === null) return;
    start.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    setProgress(0);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    viaKey.current = true;
    if (!e.repeat) begin();
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    cancel();
    setTimeout(() => (viaKey.current = false), 0);
  }

  function onClick(e: MouseEvent) {
    // detail 0 with no key down: a screen reader's virtual click.
    if (e.detail === 0 && !viaKey.current && !disabled) onSealed();
  }

  const holding = progress > 0;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          begin();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Press and hold to seal tonight’s page"
        aria-describedby="hold-seal-hint"
        className="group relative grid h-[4.5rem] w-[4.5rem] shrink-0 touch-none select-none place-items-center rounded-[22%] transition-transform duration-300 ease-out active:scale-[0.96] disabled:opacity-50"
      >
        <span className="absolute inset-0 overflow-hidden rounded-[22%] border-2 border-dashed border-accent/50 transition-colors duration-300 group-hover:border-accent">
          <span
            className="absolute inset-0 origin-bottom bg-accent/10"
            style={{ transform: `scaleY(${progress})` }}
          />
        </span>
        {/* The seal sits blank; ink rises through it from the bottom as you hold. */}
        <span className="relative grid place-items-center">
          <PersonSeal initial={initial} size={46} state="blank" />
          <span className="absolute inset-0 grid place-items-center" style={{ clipPath: `inset(${(1 - progress) * 100}% 0 0 0)` }}>
            <PersonSeal initial={initial} size={46} state="inked" className="bg-accent/10" />
          </span>
        </span>
      </button>
      <div className="min-w-0">
        <p className="font-medium text-ink">{holding ? "Keep holding…" : "Hold to seal"}</p>
        <p id="hold-seal-hint" className="text-sm text-ink/65">
          Press and hold your seal. It stamps into tonight’s row.
        </p>
      </div>
    </div>
  );
}
