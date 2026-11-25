import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { handleError, jsonError, requireUser } from "@/lib/api";

/** A page, to read. Pages are saved only through POST /api/entries (savePage). */
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
