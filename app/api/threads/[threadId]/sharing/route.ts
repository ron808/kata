import { NextResponse } from "next/server";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { SharingQuerySchema, SharingSchema, parseBody, parseQuery } from "@/lib/social/schemas";
import { cheer, comment, leave, makePrivate, post, share, sharedThread, unshare } from "@/lib/social/sharing";

/*
 * A thread shared with a few friends (lib/social/sharing.ts): its writer shares it, takes people
 * off it or makes it private again; anyone on it adds updates, comments and cheers, or leaves.
 * Every answer is the thread as the viewer now sees it.
 */

type Params = { params: Promise<{ threadId: string }> };

/** The thread as the viewer sees it, or its older updates with `?before=`. */
export async function GET(request: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { threadId } = await params;
    const { before } = parseQuery(request, SharingQuerySchema);
    await connectDB();
    const thread = await sharedThread(session.user.id, threadId, before ? new Date(before) : undefined);
    return thread ? NextResponse.json({ thread }) : jsonError("Not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const me = session.user.id;
    const limit = await checkLimit(limiters.general, `kata:${me}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);
    const { threadId } = await params;
    const body = await parseBody(request, SharingSchema);
    await connectDB();
    if (body.action === "leave") {
      const left = await leave(me, threadId);
      return left.ok ? NextResponse.json(left.value) : jsonError(left.error, left.status);
    }
    const result =
      body.action === "share"
        ? await share(me, threadId, body.people)
        : body.action === "unshare"
          ? await unshare(me, threadId, body.person)
          : body.action === "private"
            ? await makePrivate(me, threadId)
            : body.action === "post"
              ? await post(me, threadId, body.text)
              : body.action === "comment"
                ? await comment(me, threadId, body.update, body.text)
                : await cheer(me, threadId, body.update, body.kind);
    return result.ok ? NextResponse.json({ thread: result.value }) : jsonError(result.error, result.status);
  } catch (err) {
    return handleError(err);
  }
}
