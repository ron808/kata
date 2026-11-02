import { daysBetween, toUtcMidnight } from "./dates";

/**
 * The run of days ending today or yesterday, from the days with a page. Worked out from the days
 * themselves, not added to as pages arrive, because yesterday's page can be written after today's.
 */
export function streakFromDates(dates: Date[], today: Date): number {
  if (!dates.length) return 0;
  const sorted = [...dates]
    .map(toUtcMidnight)
    .sort((a, b) => b.getTime() - a.getTime());
  const firstGap = daysBetween(today, sorted[0]);
  if (firstGap > 1) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap === 1) streak++;
    else if (gap > 1) break;
  }
  return streak;
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
