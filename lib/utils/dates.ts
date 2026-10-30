/**
 * Convert any Date to a UTC midnight Date for the same calendar day.
 * The Entry.date field stores calendar day (midnight UTC) — not submission time —
 * so the contribution graph is timezone-stable.
 */
export function toUtcMidnight(d: Date | string): Date {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${String(d)}`);
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function todayUtcMidnight(): Date {
  return toUtcMidnight(new Date());
}

export function isoDay(d: Date): string {
  return toUtcMidnight(d).toISOString().slice(0, 10);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = toUtcMidnight(a).getTime() - toUtcMidnight(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return toUtcMidnight(x);
}

export function formatLongDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export type DateStyle = "long" | "weekday" | "monthDay" | "day";

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  long: { weekday: "long", month: "long", day: "numeric" },
  weekday: { weekday: "long" },
  monthDay: { month: "long", day: "numeric" },
  day: { day: "numeric" },
};

/** Format a calendar date for display. Pass timeZone "UTC" on the server for a stable result. */
export function formatDate(d: Date, style: DateStyle, timeZone?: string): string {
  return d.toLocaleDateString("en-US", { ...DATE_STYLES[style], timeZone });
}

/** A digest period: "Oct 19 – 25", "Sep 28 – Oct 4", or the month for monthly letters. */
export function formatRange(a: Date | string, b: Date | string, monthly = false): string {
  const s = new Date(a);
  const e = new Date(b);
  if (monthly) return s.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const m = (d: Date) => d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return s.getUTCMonth() === e.getUTCMonth()
    ? `${m(s)} ${s.getUTCDate()} – ${e.getUTCDate()}`
    : `${m(s)} ${s.getUTCDate()} – ${m(e)} ${e.getUTCDate()}`;
}

/** Hour of day in a time zone, for greetings. Falls back to UTC for unknown zones. */
export function hourIn(timeZone: string, d = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(d));
  } catch {
    return d.getUTCHours();
  }
}

export function formatShortDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Build a 53-week (52 columns + leading partial week) contribution grid ending today.
 */
export function buildContributionGrid(
  entries: { date: string; wordCount: number }[]
): { date: string; wordCount: number; level: 0 | 1 | 2 | 3 | 4 }[] {
  const today = todayUtcMidnight();
  const totalDays = 7 * 53;
  const start = addDays(today, -(totalDays - 1));
  // align so that the first column starts on a Sunday
  const startDow = start.getUTCDay();
  const aligned = addDays(start, -startDow);

  const map = new Map(entries.map((e) => [e.date.slice(0, 10), e.wordCount]));
  const cells: { date: string; wordCount: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  for (let i = 0; i < 7 * 53; i++) {
    const day = addDays(aligned, i);
    if (day > today) {
      cells.push({ date: isoDay(day), wordCount: 0, level: 0 });
      continue;
    }
    const wordCount = map.get(isoDay(day)) ?? 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (wordCount > 0 && wordCount < 100) level = 1;
    else if (wordCount < 250) level = 2;
    else if (wordCount < 500) level = 3;
    else if (wordCount >= 500) level = 4;
    cells.push({ date: isoDay(day), wordCount, level });
  }
  return cells;
}
