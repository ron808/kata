import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { handleError, requireUser } from "@/lib/api";
import { todayUtcMidnight } from "@/lib/utils/dates";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();

    const entry = await Entry.findOne({
      userId: session.user.id,
      date: todayUtcMidnight(),
    }).lean();

    if (!entry) return NextResponse.json({ entry: null });

    return NextResponse.json({
      entry: {
        _id: String(entry._id),
        date: entry.date.toISOString(),
        wordCount: entry.wordCount,
        tags: entry.tags,
        fields: entry.fields,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
