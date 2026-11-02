import { connectDB } from "@/lib/db/mongoose";
import { Digest } from "@/lib/db/models/Digest";
import { Entry } from "@/lib/db/models/Entry";
import { addDays, todayUtcMidnight } from "@/lib/utils/dates";
import type { DigestSummary } from "@/lib/types";

/** When the next letter is written, and whether there are pages for it yet. */
export interface NextLetter {
  /** "Sunday, November 1" or "November 1". */
  when: string;
  /** True when the writer already has a page in the period the letter will read. */
  ready: boolean;
}

// Letters are written by the daily cron (vercel.json, 12:00 UTC): weekly on Sundays about the
// seven days before, monthly on the 1st about the thirty days before. A period with no pages
// gets no letter.
const RUN_HOUR_UTC = 12;

function nextRun(type: "weekly" | "monthly", now: Date): Date {
  const today = todayUtcMidnight();
  const pastRun = now.getUTCHours() >= RUN_HOUR_UTC;
  if (type === "weekly") {
    const ahead = (7 - today.getUTCDay()) % 7;
    return addDays(today, ahead === 0 && pastRun ? 7 : ahead);
  }
  if (today.getUTCDate() === 1 && !pastRun) return today;
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
}

export async function loadLetters(
  userId: string,
  type: "weekly" | "monthly"
): Promise<{ digests: DigestSummary[]; next: NextLetter }> {
  await connectDB();
  const now = new Date();
  const run = nextRun(type, now);
  const since = type === "weekly" ? addDays(run, -7) : new Date(Date.UTC(run.getUTCFullYear(), run.getUTCMonth() - 1, 1));
  const [docs, recent] = await Promise.all([
    Digest.find({ userId, type }).sort({ createdAt: -1 }).limit(12).lean(),
    Entry.exists({ userId, date: { $gte: since, $lt: run } }),
  ]);
  return {
    digests: docs.map((d) => ({
      _id: String(d._id),
      type: d.type,
      periodStart: d.periodStart.toISOString(),
      periodEnd: d.periodEnd.toISOString(),
      content: d.content,
      entryCount: d.entryCount,
      wordCount: d.wordCount,
      isRead: d.isRead,
      createdAt: d.createdAt.toISOString(),
    })),
    next: {
      when: run.toLocaleDateString("en-US", {
        ...(type === "weekly" ? { weekday: "long" } : {}),
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
      ready: Boolean(recent),
    },
  };
}
