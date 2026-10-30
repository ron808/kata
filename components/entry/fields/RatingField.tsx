"use client";

import { radioKeys, tabStop } from "./radio";

const STEPS = [1, 2, 3, 4, 5] as const;
const STAR = "M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z";
// Stuck on by hand, so each sits a little crooked.
const TILT = [-7, 4, -3, 6, -4];

/** A star sticker: marker yellow with an ink outline and a hard shadow once it's earned. */
function Star({ on, tilt, size }: { on: boolean; tilt: number; size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      className="overflow-visible transition-[rotate,opacity] duration-300 ease-out"
      style={{
        rotate: on ? `${tilt}deg` : "0deg",
        filter: on ? "drop-shadow(1.5px 1.5px 0 var(--edge))" : undefined,
      }}
    >
      <path
        d={STAR}
        fill={on ? "var(--sun)" : "none"}
        stroke={on ? "var(--edge)" : "color-mix(in oklab, var(--ink) 45%, transparent)"}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RatingField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  const rating = value ?? 0;

  if (readOnly) {
    return (
      <p role="img" aria-label={rating ? `${label}: ${rating} of 5` : `${label}: not rated`} className="flex items-center gap-1.5">
        {STEPS.map((n) => (
          <Star key={n} on={rating >= n} tilt={TILT[n - 1]} size={26} />
        ))}
        {rating ? null : <span className="ml-2 text-[0.9375rem] text-ink/65">Not rated</span>}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={radioKeys(STEPS, value as (typeof STEPS)[number] | null, onChange)}
        className="flex"
      >
        {STEPS.map((n, i) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5`}
            tabIndex={tabStop(value === n, i, value != null)}
            onClick={() => onChange(n)}
            className="grid h-12 w-11 place-items-center rounded-full transition-transform duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0.5"
          >
            <Star on={rating >= n} tilt={TILT[i]} size={30} />
          </button>
        ))}
      </div>
      {rating ? <span className="text-[0.9375rem] font-semibold tabular-nums text-ink/70">{rating} of 5</span> : null}
    </div>
  );
}
