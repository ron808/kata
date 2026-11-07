import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { follow, setClose, unfollow } from "@/lib/social/actions";
import { CloseSchema, FollowSchema, parseBody } from "@/lib/social/schemas";

async function change(request: Request, how: typeof follow) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const me = session.user.id;
    const limit = await checkLimit(limiters.follow, `follow:${me}`);
    if (!limit.ok) return jsonError("Too many follows. Try again later.", 429);
    const { handle } = await parseBody(request, FollowSchema);
    await connectDB();
    const result = await how(me, handle);
    return result.ok ? NextResponse.json({ person: result.value }) : jsonError(result.error, result.status);
  } catch (err) {
    return handleError(err);
  }
}

export const POST = (request: Request) => change(request, follow);
export const DELETE = (request: Request) => change(request, unfollow);

/** Puts someone you follow in your people, or takes them out. */
export async function PATCH(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { handle, close } = await parseBody(request, CloseSchema);
    await connectDB();
    const result = await setClose(session.user.id, handle, close);
    return result.ok ? NextResponse.json({ person: result.value }) : jsonError(result.error, result.status);
  } catch (err) {
    return handleError(err);
  }
}
