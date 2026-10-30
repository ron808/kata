import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Moment } from "@/lib/db/models/Moment";
import { Notification } from "@/lib/db/models/Notification";
import { Reaction } from "@/lib/db/models/Reaction";
import { Reply } from "@/lib/db/models/Reply";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { isObjectId } from "@/lib/social/db";
import { momentsFor } from "@/lib/social/dto";
import { findVisibleMoment } from "@/lib/social/visibility";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ momentId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { momentId } = await ctx.params;
    await connectDB();

    const moment = await findVisibleMoment(session.user.id, momentId);
    const [visible] = moment ? await momentsFor(session.user.id, [moment]) : [];
    if (!visible) return jsonError("Not found", 404);
    return NextResponse.json(visible);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ momentId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { momentId } = await ctx.params;
    if (!isObjectId(momentId)) return jsonError("Not found", 404);
    await connectDB();

    const moment = await Moment.findOneAndDelete({ _id: momentId, userId: session.user.id }).lean();
    if (!moment) return jsonError("Not found", 404);
    await Promise.all([
      Reaction.deleteMany({ momentId: moment._id }),
      Reply.deleteMany({ momentId: moment._id }),
      Notification.deleteMany({ momentId: moment._id }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
