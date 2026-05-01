import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Digest } from "@/lib/db/models/Digest";
import { handleError, jsonError, requireUser } from "@/lib/api";

export async function PATCH(
  _request: Request,
  ctx: { params: Promise<{ digestId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { digestId } = await ctx.params;
    await connectDB();

    const digest = await Digest.findOneAndUpdate(
      { _id: digestId, userId: session.user.id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!digest) return jsonError("Not found", 404);

    return NextResponse.json({ isRead: true });
  } catch (err) {
    return handleError(err);
  }
}
