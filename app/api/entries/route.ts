import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { User } from "@/lib/db/models/User";
import { EntriesQuerySchema, EntryUpsertSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { checkLimit, clientIdentifier, limiters } from "@/lib/ratelimit/upstash";
import { todayUtcMidnight, toUtcMidnight } from "@/lib/utils/dates";
import { countWords, nextStreak } from "@/lib/utils/streaks";

const MAX_WORDS = 5000;

export async function GET(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();

    const url = new URL(request.url);
    const params = EntriesQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries())
    );

    const filter: Record<string, unknown> = { userId: session.user.id };
    if (params.tag) filter.tags = params.tag;
    if (params.startDate || params.endDate) {
      const range: Record<string, Date> = {};
      if (params.startDate) range.$gte = toUtcMidnight(params.startDate);
      if (params.endDate) range.$lte = toUtcMidnight(params.endDate);
      filter.date = range;
    }

    const total = await Entry.countDocuments(filter);
    const entries = await Entry.find(filter)
      .sort({ date: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean();

    return NextResponse.json({
      total,
      page: params.page,
      limit: params.limit,
      entries: entries.map((e) => ({
        _id: String(e._id),
        date: e.date.toISOString(),
        wordCount: e.wordCount,
        tags: e.tags,
        fields: e.fields,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();

    const ip = clientIdentifier(request);
    const limit = await checkLimit(
      limiters.entryCreate,
      `entry:${session.user.id}:${ip}`
    );
    if (!limit.ok) return jsonError("Daily entry limit reached.", 429);

    const body = await request.json();
    const data = EntryUpsertSchema.parse(body);

    const date = data.date ? toUtcMidnight(data.date) : todayUtcMidnight();
    const today = todayUtcMidnight();
    if (date.getTime() > today.getTime()) {
      return jsonError("Cannot create an entry in the future.", 400);
    }

    const user = await User.findById(session.user.id).lean();
    if (!user) return jsonError("User not found", 404);
    if (!user.activeTemplateId)
      return jsonError("No active template — finish onboarding first.", 400);

    const wordCount = data.fields.reduce((sum, f) => {
      if (typeof f.value === "string") return sum + countWords(f.value);
      return sum;
    }, 0);
    if (wordCount > MAX_WORDS)
      return jsonError(`Entry exceeds ${MAX_WORDS} words.`, 400);

    const tags = Array.from(
      new Set(
        data.fields
          .filter((f) => f.type === "tags" && Array.isArray(f.value))
          .flatMap((f) => f.value as string[])
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      )
    ).slice(0, 30);

    const existing = await Entry.findOne({
      userId: session.user.id,
      date,
    });
    const previousWordCount = existing?.wordCount ?? 0;

    let entry;
    if (existing) {
      existing.fields = data.fields;
      existing.wordCount = wordCount;
      existing.tags = tags;
      await existing.save();
      entry = existing;
    } else {
      entry = await Entry.create({
        userId: session.user.id,
        templateId: user.activeTemplateId,
        date,
        fields: data.fields,
        wordCount,
        tags,
      });
    }

    if (!existing) {
      const newStreak = nextStreak(user.streak, user.lastEntryDate, date);
      const newLongest = Math.max(user.longestStreak, newStreak);
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { totalEntries: 1, totalWords: wordCount },
        $set: {
          streak: newStreak,
          longestStreak: newLongest,
          lastEntryDate: date,
        },
      });
    } else {
      const wordDelta = wordCount - previousWordCount;
      if (wordDelta !== 0) {
        await User.findByIdAndUpdate(session.user.id, {
          $inc: { totalWords: wordDelta },
        });
      }
    }

    return NextResponse.json({
      _id: String(entry._id),
      date: entry.date.toISOString(),
      wordCount: entry.wordCount,
      tags: entry.tags,
      created: !existing,
    });
  } catch (err) {
    return handleError(err);
  }
}
