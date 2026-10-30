import { addDays } from "@/lib/companion/time";
import { weekdayIndex } from "@/lib/breakdowns/period";

/*
 * The small pictures in a breakdown: a square for each day, and bars for numbers and moods.
 * Each one is a single image to a screen reader, with its words as the label.
 */

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
/** Longer stretches get the numbers without a square per day. */
export const DRAWN_DAYS = 62;

export function daysBetween(from: string, upTo: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= upTo && days.length <= DRAWN_DAYS; d = addDays(d, 1)) days.push(d);
  return days;
}

/** A square per day, filled on the days in `on`: a row with weekday letters for two weeks or less, else a calendar. */
export function DayStrip({ from, upTo, on, label, hue }: { from: string; upTo: string; on: string[]; label: string; hue?: number }) {
  const days = daysBetween(from, upTo);
  if (!days.length || days.length > DRAWN_DAYS) return null;
  const set = new Set(on);
  const filled = hue === undefined ? "border-edge bg-ink" : "border-edge bg-hue";
  if (days.length <= 14) {
    return (
      <div role="img" aria-label={label} data-hue={hue} className="flex flex-wrap gap-x-1.5 gap-y-2">
        {days.map((d) => (
          <span key={d} className="flex w-6 flex-col items-center gap-1">
            <span className={`block h-6 w-6 rounded-[7px] border-2 ${set.has(d) ? filled : "border-edge/25"}`} />
            <span className="text-[0.8125rem] leading-none text-ink/65">{LETTERS[weekdayIndex(d)]}</span>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div role="img" aria-label={label} data-hue={hue} className="grid w-full max-w-[15rem] grid-cols-7 gap-1">
      {/* The first week starts on its weekday, so the columns are Monday to Sunday. */}
      {Array.from({ length: weekdayIndex(days[0]) }, (_, i) => (
        <span key={`before-${i}`} aria-hidden />
      ))}
      {days.map((d) => (
        <span key={d} className={`block aspect-square rounded-[5px] border-2 ${set.has(d) ? filled : "border-edge/25"}`} />
      ))}
    </div>
  );
}

/**
 * A bar for each day of the stretch, from `values` (missing days are empty), with the goal as
 * a line. For numbers in the thread's colour, and moods in ink.
 */
export function DayBars({
  from,
  upTo,
  values,
  max,
  goal = null,
  label,
  hue,
}: {
  from: string;
  upTo: string;
  values: { day: string; value: number }[];
  max: number;
  goal?: number | null;
  label: string;
  hue?: number;
}) {
  const days = daysBetween(from, upTo);
  if (days.length < 2 || days.length > 31) return null;
  const byDay = new Map(values.map((v) => [v.day, v.value]));
  const top = Math.max(max, goal ?? 0, 1);
  return (
    <div role="img" aria-label={label} data-hue={hue} className="relative flex h-14 items-end gap-[3px]">
      {goal ? <span aria-hidden className="absolute inset-x-0 border-t-2 border-dashed border-edge/45" style={{ bottom: `${(goal / top) * 100}%` }} /> : null}
      {days.map((d) => {
        const v = byDay.get(d);
        return (
          <span
            key={d}
            className={`block min-w-[3px] max-w-4 flex-1 rounded-t-[4px] ${v ? (hue === undefined ? "bg-ink" : "border-2 border-b-0 border-edge bg-hue") : "h-[3px] rounded-[2px] bg-ink/15"}`}
            style={v ? { height: `${Math.max(8, (v / top) * 100)}%` } : undefined}
          />
        );
      })}
    </div>
  );
}

/** A bar 0–1, in ink, for the parts of the score. */
export function Meter({ value }: { value: number | null }) {
  return (
    <span aria-hidden className="mt-3 block h-2 overflow-clip rounded-full bg-ink/10">
      {value !== null ? <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} /> : null}
    </span>
  );
}
