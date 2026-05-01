import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { User } from "@/lib/db/models/User";
import { EntryUpsertSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { todayUtcMidnight } from "@/lib/utils/dates";
import { countWords } from "@/lib/utils/streaks";

const MAX_WORDS = 5000;

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ entryId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { entryId } = await ctx.params;
    await connectDB();

    const entry = await Entry.findOne({
      _id: entryId,
      userId: session.user.id,
    }).lean();
    if (!entry) return jsonError("Not found", 404);

    return NextResponse.json({
      _id: String(entry._id),
      date: entry.date.toISOString(),
      wordCount: entry.wordCount,
      tags: entry.tags,
      fields: entry.fields,
      templateId: String(entry.templateId),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ entryId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { entryId } = await ctx.params;
    await connectDB();

    const body = await request.json();
    const data = EntryUpsertSchema.parse(body);

    const entry = await Entry.findOne({
      _id: entryId,
      userId: session.user.id,
    });
    if (!entry) return jsonError("Not found", 404);

    const today = todayUtcMidnight();
    if (entry.date.getTime() !== today.getTime()) {
      return jsonError("Past entries are immutable.", 403);
    }

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

    const previousWordCount = entry.wordCount;
    entry.fields = data.fields;
    entry.wordCount = wordCount;
    entry.tags = tags;
    await entry.save();

    const wordDelta = wordCount - previousWordCount;
    if (wordDelta !== 0) {
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { totalWords: wordDelta },
      });
    }

    return NextResponse.json({
      _id: String(entry._id),
      date: entry.date.toISOString(),
      wordCount: entry.wordCount,
      tags: entry.tags,
      fields: entry.fields,
      templateId: String(entry.templateId),
    });
  } catch (err) {
    return handleError(err);
  }
}
