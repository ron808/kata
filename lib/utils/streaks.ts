import { daysBetween, todayUtcMidnight, toUtcMidnight } from "./dates";

/**
 * Recalculate streak after an entry is created/updated.
 * - Same-day re-save: streak unchanged.
 * - Yesterday was last entry: streak += 1.
 * - Otherwise: streak resets to 1.
 */
export function nextStreak(
  currentStreak: number,
  lastEntryDate: Date | null,
  entryDate: Date
): number {
  const today = toUtcMidnight(entryDate);
  if (!lastEntryDate) return 1;
  const last = toUtcMidnight(lastEntryDate);
  const gap = daysBetween(today, last);
  if (gap === 0) return currentStreak;
  if (gap === 1) return currentStreak + 1;
  return 1;
}

/**
 * Compute current streak from a sorted-desc list of entry dates.
 * Used for stats endpoint when we don't trust the cached value.
 */
export function streakFromDates(dates: Date[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates]
    .map(toUtcMidnight)
    .sort((a, b) => b.getTime() - a.getTime());
  const today = todayUtcMidnight();
  const firstGap = daysBetween(today, sorted[0]);
  if (firstGap > 1) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap === 1) streak++;
    else break;
  }
  return streak;
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
