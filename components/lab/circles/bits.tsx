import { PersonSeal } from "@/components/lab/PersonSeal";
import type { Me } from "@/components/lab/cast";
import { person } from "@/components/lab/cast";
import { MOODS } from "./data";

/** The one motion curve. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Six points on a ring: "a circle of people". Drawn in the Icon family's 24px, 1.6 stroke. */
export function CircleGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className={`shrink-0 ${className}`} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="7.5" strokeDasharray="2.6 5.25" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LockGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden focusable="false">
      <path d="M6 10.5h12v9.5H6zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" />
    </svg>
  );
}

/** A mood face as content, with its level for screen readers. */
export function Mood({ level, className = "text-[1.35rem]" }: { level?: number; className?: string }) {
  if (!level) return null;
  return (
    <span role="img" aria-label={`Mood ${level} of 5`} className={`leading-none ${className}`}>
      {MOODS[level - 1]}
    </span>
  );
}

/**
 * The circle's letterhead: every member's seal set around a ring, you at the top, each
 * stamped at its own small angle. A ring, not a row, so the initials never read as a word.
 */
export function SealRing({
  ids,
  me,
  size = 28,
  label,
}: {
  ids: string[];
  me: Me;
  size?: number;
  label?: string;
}) {
  const all = [me.initial, ...ids.map((id) => person(id).initial)];
  const r = size * 0.98;
  const box = Math.round(2 * r + size);
  const tilt = [-6, 5, -3, 7, -5, 3, -7, 4, -2, 6, -4, 2];
  return (
    <span role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="relative inline-block shrink-0" style={{ width: box, height: box }}>
      {all.map((initial, i) => {
        const a = (i / all.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <span
            key={i}
            className="absolute"
            style={{ left: box / 2 + Math.cos(a) * r - size / 2, top: box / 2 + Math.sin(a) * r - size / 2, rotate: `${tilt[i % tilt.length]}deg` }}
          >
            <PersonSeal initial={initial} size={size} state="inked" />
          </span>
        );
      })}
    </span>
  );
}
