import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Moment } from "@/lib/db/models/Moment";
import { Reply } from "@/lib/db/models/Reply";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { replyTo } from "@/lib/social/actions";
import { isObjectId } from "@/lib/social/db";
import { repliesFor } from "@/lib/social/dto";
import { unnotify } from "@/lib/social/notify";
import { ReplySchema, parseBody } from "@/lib/social/schemas";
import { findVisibleMoment } from "@/lib/social/visibility";

const MAX_REPLIES = 100;

type Ctx = { params: Promise<{ momentId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { momentId } = await ctx.params;
    await connectDB();

    const moment = await findVisibleMoment(session.user.id, momentId);
    if (!moment) return jsonError("Not found", 404);
    const replies = await Reply.find({ momentId: moment._id })
      .sort({ createdAt: 1, _id: 1 })
      .limit(MAX_REPLIES)
      .lean();
    return NextResponse.json(await repliesFor(session.user.id, replies));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const me = session.user.id;
    const { momentId } = await ctx.params;

    const limit = await checkLimit(limiters.reply, `reply:${me}`);
    if (!limit.ok) return jsonError("Too many replies. Try again later.", 429);

    const { text } = await parseBody(request, ReplySchema);
    await connectDB();
    const result = await replyTo(me, momentId, text);
    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json(result.value, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

/** `?replyId=`. The reply's author can take it back; the moment's author can remove it. */
export async function DELETE(request: Request, ctx: Ctx) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const me = session.user.id;
    const { momentId } = await ctx.params;
    const replyId = new URL(request.url).searchParams.get("replyId") ?? "";
    if (!isObjectId(replyId)) return jsonError("Not found", 404);
    await connectDB();

    const moment = await findVisibleMoment(me, momentId);
    if (!moment) return jsonError("Not found", 404);
    const reply = await Reply.findOne({ _id: replyId, momentId: moment._id }).select("userId").lean();
    if (!reply) return jsonError("Not found", 404);
    if (String(reply.userId) !== me && String(moment.userId) !== me) {
      return jsonError("Forbidden", 403);
    }

    const { deletedCount } = await Reply.deleteOne({ _id: reply._id });
    if (deletedCount === 1) {
      await Moment.updateOne({ _id: moment._id, replyCount: { $gt: 0 } }, { $inc: { replyCount: -1 } });
      if (!(await Reply.exists({ momentId: moment._id, userId: reply.userId }))) {
        await unnotify({ userId: moment.userId, actorId: reply.userId, kind: "reply", momentId: moment._id });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
