import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { handleError, requireUser } from "@/lib/api";
import { User } from "@/lib/db/models/User";
import { todayIn, validTimeZone } from "@/lib/companion/time";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();

    const user = await User.findById(session.user.id).select("timezone").lean();
    const entry = await Entry.findOne({
      userId: session.user.id,
      date: todayIn(validTimeZone(user?.timezone)),
    }).lean();

    if (!entry) return NextResponse.json({ entry: null });

    return NextResponse.json({
      entry: {
        _id: String(entry._id),
        date: entry.date.toISOString(),
        wordCount: entry.wordCount,
        tags: entry.tags,
        fields: entry.fields,
        templateId: String(entry.templateId),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
