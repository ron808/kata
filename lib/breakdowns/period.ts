import { addDays, dayDiff } from "@/lib/companion/time";
import type { PeriodUnit } from "@/lib/types";

/*
 * Stretches of time for breakdowns, as the writer's local days (yyyy-mm-dd, both ends
 * included). Weeks start on Monday. Words like "last month" or "since Oct 3" are read here, in
 * code, so whatever a writer or the model says lands on the same days.
 */

export interface Period {
  from: string;
  to: string;
  unit: PeriodUnit;
}

/** The stretches offered first. */
export const PERIOD_IDEAS = ["This week", "Last week", "This month", "Last month", "This year", "Last 30 days"];

/** The longest stretch a breakdown covers, in days. */
const LONGEST = 3 * 366;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  couple: 2,
  three: 3,
  few: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const split = (day: string) => day.split("-").map(Number) as [number, number, number];
const iso = (y: number, m: number, d: number) => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const monthLength = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** 0 for Monday … 6 for Sunday. */
export const weekdayIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
export const weekStart = (day: string) => addDays(day, -weekdayIndex(day));
export const monthStart = (day: string) => `${day.slice(0, 8)}01`;

export function monthEnd(day: string): string {
  const [y, m] = split(day);
  return iso(y, m, monthLength(y, m));
}

/** The same day n months on (or back), or the month's last day when it's shorter. */
export function addMonths(day: string, n: number): string {
  const [y, m, d] = split(day);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  return iso(year, month, Math.min(d, monthLength(year, month)));
}

const monthOf = (word: string) => (word.length >= 3 ? MONTHS.findIndex((m) => m.startsWith(word)) : -1);

function valid(y: number, m: number, d: number): string | null {
  return m >= 1 && m <= 12 && d >= 1 && d <= monthLength(y, m) ? iso(y, m, d) : null;
}

/** A day in their words: "today", "Monday", "Oct 3", "3 October 2025", "2026-10-03". A date without a year is the latest one that isn't ahead. */
export function parseDay(raw: string, today: string): string | null {
  const s = raw
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:on|the)\s+/, "");
  if (s === "today") return today;
  if (s === "yesterday") return addDays(today, -1);
  const isoDay = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDay) return valid(+isoDay[1], +isoDay[2], +isoDay[3]);
  const weekday = s.match(/^(last )?([a-z]+)$/);
  if (weekday) {
    const i = WEEKDAYS.findIndex((w) => w === weekday[2] || (weekday[2].length >= 3 && w.startsWith(weekday[2])));
    if (i >= 0) {
      const back = (weekdayIndex(today) - i + 7) % 7;
      return addDays(today, -(back === 0 && weekday[1] ? 7 : back));
    }
  }
  const monthFirst = s.match(/^([a-z]+)\.? (\d{1,2})(?: (\d{4}))?$/);
  const dayFirst = s.match(/^(\d{1,2}) ([a-z]+)\.?(?: (\d{4}))?$/);
  const [word, dayText, yearText] = monthFirst ? [monthFirst[1], monthFirst[2], monthFirst[3]] : dayFirst ? [dayFirst[2], dayFirst[1], dayFirst[3]] : [];
  if (!word || !dayText) return null;
  const month = monthOf(word);
  if (month < 0) return null;
  const [year] = split(today);
  if (yearText) return valid(+yearText, month + 1, +dayText);
  const guess = valid(year, month + 1, +dayText);
  return guess && guess > today ? valid(year - 1, month + 1, +dayText) : guess;
}

const rolling = (today: string, from: string): Period => ({ from, to: today, unit: "days" });

function lastUnits(n: number, unit: string, today: string): Period | null {
  if (!Number.isFinite(n) || n < 1) return null;
  if (unit === "day") return rolling(today, addDays(today, -(n - 1)));
  if (unit === "week") return rolling(today, addDays(today, -(7 * n - 1)));
  if (unit === "month") return rolling(today, addDays(addMonths(today, -n), 1));
  if (unit === "year") return rolling(today, addDays(addMonths(today, -12 * n), 1));
  return null;
}

function weekend(today: string, before: boolean): Period {
  const i = weekdayIndex(today);
  // On a Saturday or Sunday, "the weekend" is this one; otherwise the last one.
  const saturday = i >= 5 && !before ? addDays(weekStart(today), 5) : addDays(weekStart(today), -2);
  return { from: saturday, to: addDays(saturday, 1), unit: "days" };
}

/**
 * The days a stretch in their words covers: "this week", "last month", "the past 3 weeks",
 * "October", "2025", "since Oct 3", "Oct 3 to 15", "all time". `start` is the day they joined,
 * for "all time". Null when it can't tell, or the stretch is all ahead of today or too long.
 */
export function parsePeriod(raw: string, today: string, start?: string): Period | null {
  const s = raw
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[?!.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:(?:for|in|over|during|across|about|of|my|the|this past)\s+)+/, (m) => (m.includes("this past") ? "past " : ""))
    .replace(/\s+(?:so far|till now|until now|to date|up to now|to now|until today)$/, "")
    .trim();
  const found = read(s, today, start);
  if (!found || found.from > found.to || found.from > today || dayDiff(found.to, found.from) >= LONGEST) return null;
  return found;
}

function read(s: string, today: string, start?: string): Period | null {
  const [year] = split(today);
  const thisWeek = weekStart(today);
  const lastMonth = addMonths(monthStart(today), -1);
  switch (s) {
    case "today":
      return { from: today, to: today, unit: "day" };
    case "yesterday":
      return { from: addDays(today, -1), to: addDays(today, -1), unit: "day" };
    case "week":
      // "How was my week?" on a Monday means the one that just ended.
      if (today === thisWeek) return { from: addDays(thisWeek, -7), to: addDays(thisWeek, -1), unit: "week" };
      return { from: thisWeek, to: addDays(thisWeek, 6), unit: "week" };
    case "this week":
    case "current week":
      return { from: thisWeek, to: addDays(thisWeek, 6), unit: "week" };
    case "last week":
    case "previous week":
      return { from: addDays(thisWeek, -7), to: addDays(thisWeek, -1), unit: "week" };
    case "month":
      if (today === monthStart(today)) return { from: lastMonth, to: monthEnd(lastMonth), unit: "month" };
      return { from: monthStart(today), to: monthEnd(today), unit: "month" };
    case "this month":
    case "current month":
      return { from: monthStart(today), to: monthEnd(today), unit: "month" };
    case "last month":
    case "previous month":
      return { from: lastMonth, to: monthEnd(lastMonth), unit: "month" };
    case "year":
    case "this year":
    case "current year":
      return { from: `${year}-01-01`, to: `${year}-12-31`, unit: "year" };
    case "last year":
    case "previous year":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31`, unit: "year" };
    case "weekend":
    case "this weekend":
      return weekend(today, false);
    case "last weekend":
      return weekend(today, true);
    case "past week":
      return lastUnits(1, "week", today);
    case "past month":
      return lastUnits(1, "month", today);
    case "past year":
      return lastUnits(1, "year", today);
    case "fortnight":
    case "past fortnight":
    case "last fortnight":
      return lastUnits(14, "day", today);
    case "all":
    case "all time":
    case "ever":
    case "everything":
    case "since i started":
    case "since i joined":
    case "since the start":
    case "since the beginning":
      return rolling(today, start && start < today ? start : addDays(today, -364));
  }

  // "last 3 weeks", "past two months", "30 days", "a couple of weeks"
  const units = s.match(/^(?:(?:last|past|previous)\s+)?((?:a\s+)?(?:\d+|[a-z]+)(?:\s+of)?)\s+(day|week|month|year)s?$/);
  if (units) {
    const count = units[1].replace(/^a\s+(?=[a-z])/, "").replace(/\s+of$/, "");
    const n = /^\d+$/.test(count) ? Number(count) : NUMBERS[count];
    if (n) return lastUnits(n, units[2], today);
  }

  // "October", "oct 2025"
  const month = s.match(/^([a-z]+)\.?(?: (\d{4}))?$/);
  if (month && monthOf(month[1]) >= 0) {
    const m = monthOf(month[1]) + 1;
    const first = iso(month[2] ? Number(month[2]) : year, m, 1);
    const from = !month[2] && first > today ? iso(year - 1, m, 1) : first;
    return { from, to: monthEnd(from), unit: "month" };
  }

  // "2025"
  if (/^\d{4}$/.test(s)) return { from: `${s}-01-01`, to: `${s}-12-31`, unit: "year" };

  // "since Oct 3", "since monday"
  const since = s.match(/^(?:since|from|starting|after)\s+(.+)$/);
  if (since && !/\s(?:to|until|till|through|thru)\s|\s[–—-]\s/.test(since[1])) {
    const from = parseDay(since[1], today);
    return from ? rolling(today, from) : null;
  }

  // "Oct 3 to 15", "from 2026-10-01 to 2026-10-15", "Sep 28 – Oct 3"
  const range = s.replace(/^(?:from|between)\s+/, "").match(/^(.+?)\s*(?:\s(?:to|until|till|through|thru|and)\s|\s?[–—]\s?|\s-\s|\.\.)\s*(.+)$/);
  if (range) {
    const from = parseDay(range[1], today);
    if (!from) return null;
    // "Oct 3 to 15", "until the 10th": the same month.
    const endText = range[2].replace(/^the\s+/, "");
    const end = /^\d{1,2}(?:st|nd|rd|th)?$/.test(endText) ? valid(...(split(from).slice(0, 2) as [number, number]), parseInt(endText, 10)) : parseDay(endText, today);
    const to = end && end < from && !/\d{4}/.test(endText) ? addMonths(end, 12) : end;
    return to ? { from, to, unit: "days" } : null;
  }

  const day = parseDay(s, today);
  return day ? { from: day, to: day, unit: "day" } : null;
}

// ── Names for stretches ───────────────────────────────────────────────────────

const fmt = (day: string, o: Intl.DateTimeFormatOptions) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

/** "Oct 19 – 25", "Sep 28 – Oct 3", "Dec 29, 2025 – Jan 4, 2026": the year only when it isn't this one. */
export function rangeText(from: string, to: string, today: string): string {
  const year = today.slice(0, 4);
  const withYear = from.slice(0, 4) !== year || to.slice(0, 4) !== year;
  if (from === to) return fmt(from, { weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
  if (from.slice(0, 7) === to.slice(0, 7)) return `${fmt(from, { month: "short", day: "numeric" })} – ${fmt(to, { day: "numeric" })}${withYear ? `, ${to.slice(0, 4)}` : ""}`;
  if (from.slice(0, 4) === to.slice(0, 4)) return `${fmt(from, { month: "short", day: "numeric" })} – ${fmt(to, { month: "short", day: "numeric" })}${withYear ? `, ${to.slice(0, 4)}` : ""}`;
  return `${fmt(from, { month: "short", day: "numeric", year: "numeric" })} – ${fmt(to, { month: "short", day: "numeric", year: "numeric" })}`;
}

/** What a stretch is called, seen from today: "This week", "Last month", "October", "Week of Oct 19", "Last 30 days". */
export function periodName(p: Period, today: string): string {
  const year = today.slice(0, 4);
  switch (p.unit) {
    case "day":
      if (p.from === today) return "Today";
      if (p.from === addDays(today, -1)) return "Yesterday";
      return fmt(p.from, { weekday: "long", month: "short", day: "numeric", ...(p.from.slice(0, 4) !== year ? { year: "numeric" } : {}) });
    case "week":
      if (p.from === weekStart(today)) return "This week";
      if (p.from === addDays(weekStart(today), -7)) return "Last week";
      return `Week of ${fmt(p.from, { month: "short", day: "numeric", ...(p.from.slice(0, 4) !== year ? { year: "numeric" } : {}) })}`;
    case "month":
      if (p.from === monthStart(today)) return "This month";
      if (p.from === addMonths(monthStart(today), -1)) return "Last month";
      return fmt(p.from, { month: "long", ...(p.from.slice(0, 4) !== year ? { year: "numeric" } : {}) });
    case "year":
      if (p.from.slice(0, 4) === year) return "This year";
      if (Number(p.from.slice(0, 4)) === Number(year) - 1) return "Last year";
      return p.from.slice(0, 4);
    default:
      return p.to === today ? `Last ${dayDiff(p.to, p.from) + 1} days` : rangeText(p.from, p.to, today);
  }
}

/** Its name with how much of it was counted: "This week so far", "October, up to Oct 12". */
export function periodTitle(p: Period, upTo: string, today: string): string {
  const name = periodName(p, today);
  if (upTo >= p.to) return name;
  if (upTo === today) return `${name} so far`;
  return `${name}, up to ${fmt(upTo, { month: "short", day: "numeric" })}`;
}
