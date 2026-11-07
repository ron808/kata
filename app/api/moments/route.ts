import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { shareMoment } from "@/lib/social/actions";
import { feed, isFeedCursor } from "@/lib/social/feed";
import { FeedQuerySchema, MomentCreateSchema, parseBody, parseQuery } from "@/lib/social/schemas";

export async function GET(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    const { tag, before } = parseQuery(request, FeedQuerySchema);
    if (before && !isFeedCursor(before)) return jsonError("Invalid cursor.", 400);
    await connectDB();
    return NextResponse.json(await feed(session.user.id, { tag, before }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const me = session.user.id;

    const limit = await checkLimit(limiters.moment, `moment:${me}`);
    if (!limit.ok) return jsonError("That's a lot of sharing for one hour. Try again later.", 429);

    const data = await parseBody(request, MomentCreateSchema);
    await connectDB();
    const result = await shareMoment(me, { ...data, entryId: data.entryId ?? null });
    return result.ok ? NextResponse.json(result.value, { status: 201 }) : jsonError(result.error, result.status);
  } catch (err) {
    return handleError(err);
  }
}
