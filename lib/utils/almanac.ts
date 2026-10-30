import { isoDay } from "./dates";

export type Level = 0 | 1 | 2 | 3 | 4;

export interface AlmanacDay {
  date: string;
  words: number;
  level: Level;
  future: boolean;
  today: boolean;
}

export interface AlmanacMonth {
  key: string;
  label: string;
  /** Empty cells before the 1st, Monday first. */
  lead: number;
  days: AlmanacDay[];
}

/** Ink depth for a day's word count (the same thresholds as the old contribution graph). */
export function levelFor(words: number): Level {
  if (words <= 0) return 0;
  if (words < 100) return 1;
  if (words < 250) return 2;
  if (words < 500) return 3;
  return 4;
}

/** Twelve calendar months ending with the month of `end` (UTC calendar days). */
export function buildAlmanac(words: Map<string, number>, end: Date, months = 12): AlmanacMonth[] {
  const todayIso = isoDay(end);
  const out: AlmanacMonth[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const first = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - k, 1));
    const y = first.getUTCFullYear();
    const m = first.getUTCMonth();
    const length = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const days: AlmanacDay[] = [];
    for (let d = 1; d <= length; d++) {
      const iso = isoDay(new Date(Date.UTC(y, m, d)));
      const w = words.get(iso) ?? 0;
      days.push({ date: iso, words: w, level: levelFor(w), future: iso > todayIso, today: iso === todayIso });
    }
    const name = first.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    out.push({
      key: `${y}-${m}`,
      label: k === months - 1 || m === 0 ? `${name} ${y}` : name,
      lead: (first.getUTCDay() + 6) % 7,
      days,
    });
  }
  return out;
}

/** A plausible example year for the landing page: a habit that starts patchy and settles. */
export function exampleYear(end: Date): Map<string, number> {
  const words = new Map<string, number>();
  let seed = 0x4b415441; // "KATA"
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  for (let back = 364; back >= 1; back--) {
    const ramp = 1 - back / 364;
    if (rnd() < 0.22 + ramp * 0.66) {
      const r = rnd();
      words.set(
        isoDay(new Date(end.getTime() - back * 86_400_000)),
        Math.round(30 + r * r * (180 + ramp * 520))
      );
    }
  }
  return words;
}
