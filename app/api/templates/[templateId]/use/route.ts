import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import { handleError, jsonError, requireUser } from "@/lib/api";

/** Makes one of the writer's own pages today's page. The others stay, to switch back to. */
export async function POST(_request: Request, ctx: { params: Promise<{ templateId: string }> }) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { templateId } = await ctx.params;
    if (!mongoose.isObjectIdOrHexString(templateId)) return jsonError("Not found", 404);
    await connectDB();
    const template = await Template.findOne({ _id: templateId, userId: session.user.id }).select("name").lean();
    if (!template) return jsonError("Not found", 404);
    await User.updateOne({ _id: session.user.id }, { $set: { activeTemplateId: template._id } });
    return NextResponse.json({ ok: true, name: template.name });
  } catch (err) {
    return handleError(err);
  }
}
