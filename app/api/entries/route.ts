import { after, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { EntriesQuerySchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { checkLimit, clientIdentifier, limiters } from "@/lib/ratelimit/upstash";
import { toUtcMidnight } from "@/lib/utils/dates";
import { PageUpsertSchema } from "@/lib/companion/schemas";
import { updateThreadsFromPage } from "@/lib/companion/pages";
import { PageError, savePage } from "@/lib/entries/save";

export const maxDuration = 60;

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
    if (!limit.ok) return jsonError("That’s a lot of saving. Try again in a minute.", 429);

    const body = await request.json();
    const data = PageUpsertSchema.parse(body);

    let saved;
    try {
      saved = await savePage(session.user.id, { fields: data.fields, date: data.date });
    } catch (err) {
      if (err instanceof PageError) return jsonError(err.message, err.status);
      throw err;
    }

    // Kata reads the page after the response is sent; a failure there never fails the save.
    const page = { _id: saved._id, fields: data.fields };
    const userId = session.user.id;
    after(async () => {
      try {
        await updateThreadsFromPage(userId, page, saved.previousFields, { final: data.final === true });
      } catch (err) {
        console.error("companion:page", err);
      }
    });

    return NextResponse.json({
      _id: saved._id,
      date: saved.date.toISOString(),
      wordCount: saved.wordCount,
      tags: saved.tags,
      created: saved.created,
    });
  } catch (err) {
    return handleError(err);
  }
}
