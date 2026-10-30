// Small drawn meters for mood and energy, so neither leans on emoji. No hooks: safe on the server.

export const MOOD_LABELS = ["Foggy", "Low", "Okay", "Good", "Bright"] as const;
export const ENERGY_LABELS = ["Empty", "Low", "Steady", "Good", "Full"] as const;

export function moodLabel(value: number | null | undefined): string | null {
  return value && value >= 1 && value <= 5 ? MOOD_LABELS[Math.round(value) - 1] : null;
}

export function energyLabel(value: number | null | undefined): string | null {
  return value && value >= 1 && value <= 5 ? ENERGY_LABELS[Math.round(value) - 1] : null;
}

/** Five dots, the first `value` of them full. */
export function MoodDots({ value, size = 5, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center gap-[3px] ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="rounded-full bg-current"
          style={{ width: size, height: size, opacity: i <= value ? 1 : 0.22 }}
        />
      ))}
    </span>
  );
}

/** Five rising bars, like a battery, the first `value` of them full. */
export function EnergyBars({ value, height = 11, className = "" }: { value: number; height?: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-end gap-[2px] ${className}`} style={{ height }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px] bg-current"
          style={{ height: `${40 + i * 12}%`, opacity: i <= value ? 1 : 0.22 }}
        />
      ))}
    </span>
  );
}
