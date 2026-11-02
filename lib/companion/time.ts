/**
 * Days as yyyy-mm-dd strings in the writer's own time zone. A writer's day ends when they go to
 * bed, not at midnight: until 4am it's still the day they've been living, so 1am belongs to the
 * evening before and "tomorrow" means after they've slept.
 */

const DAY_TURNS_AT = 4;

export function validTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The writer's day at `at` in `timeZone` (pass a zone from validTimeZone). */
export function localDay(timeZone: string, at: Date = new Date()): string {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  const turned = new Date(new Date(at).getTime() - DAY_TURNS_AT * 3_600_000);
  const parts = Object.fromEntries(f.formatToParts(turned).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toUtc(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: string, n: number): string {
  const d = toUtc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `b` to `a`. */
export function dayDiff(a: string, b: string): number {
  return Math.round((toUtc(a).getTime() - toUtc(b).getTime()) / 86_400_000);
}

/** The day as a UTC-midnight Date, the way Entry.date and Thread.dueAt store calendar days. */
export function dayToDate(day: string): Date {
  return toUtc(day);
}

/** The writer's today as a UTC-midnight Date, the way Entry.date stores days. */
export function todayIn(timeZone: string, at: Date = new Date()): Date {
  return dayToDate(localDay(timeZone, at));
}

/**
 * The day a page opens on. Before noon, what there is to write about is the day just lived,
 * until its page is written.
 */
export function pageDayFor(today: string, hour: number, yesterdayDone: boolean): string {
  return hour >= DAY_TURNS_AT && hour < 12 && !yesterdayDone ? addDays(today, -1) : today;
}

/** The calendar day a UTC-midnight date stands for. */
export function dateToDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(day: string): string {
  return toUtc(day).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

export function monthDayOf(day: string): string {
  return toUtc(day).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

/** "Yesterday", "On Monday", "Last week": when something last came up, relative to today. */
export function whenPhrase(fromDay: string, today: string): string {
  const d = dayDiff(today, fromDay);
  if (d <= 0) return "Earlier today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `On ${weekdayOf(fromDay)}`;
  if (d < 14) return "Last week";
  return "A while back";
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A due date from the API: a bare yyyy-mm-dd is that day; a full timestamp is its day in the writer's zone. */
export function parseDueAt(input: string, timeZone: string): Date | null {
  if (ISO_DAY.test(input)) return dayToDate(input);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return dayToDate(localDay(timeZone, d));
}
