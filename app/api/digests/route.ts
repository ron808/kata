import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Digest } from "@/lib/db/models/Digest";
import { handleError, requireUser } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();

    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    const filter: Record<string, unknown> = { userId: session.user.id };
    if (type === "weekly" || type === "monthly") filter.type = type;

    const digests = await Digest.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      digests: digests.map((d) => ({
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
    });
  } catch (err) {
    return handleError(err);
  }
}
