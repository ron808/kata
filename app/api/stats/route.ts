import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Entry } from "@/lib/db/models/Entry";
import { handleError, requireUser } from "@/lib/api";
import { buildContributionGrid } from "@/lib/utils/dates";
import { streakFromDates } from "@/lib/utils/streaks";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();

    const user = await User.findById(session.user.id).lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const entries = await Entry.find({ userId: session.user.id })
      .select("date wordCount")
      .sort({ date: -1 })
      .lean();

    const recomputedStreak = streakFromDates(entries.map((e) => e.date));
    const grid = buildContributionGrid(
      entries.map((e) => ({
        date: e.date.toISOString(),
        wordCount: e.wordCount,
      }))
    );

    return NextResponse.json({
      totalEntries: user.totalEntries,
      totalWords: user.totalWords,
      streak: recomputedStreak,
      longestStreak: Math.max(user.longestStreak, recomputedStreak),
      contributions: grid,
    });
  } catch (err) {
    return handleError(err);
  }
}
