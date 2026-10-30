import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import { handleError, jsonError, requireUser } from "@/lib/api";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await ctx.params;
    await connectDB();

    const template = await Template.findById(templateId).lean();
    if (!template) return jsonError("Not found", 404);

    if (!template.isPublished) {
      const { session, response } = await requireUser();
      if (response) return response;
      if (String(template.userId) !== session.user.id) {
        return jsonError("Forbidden", 403);
      }
    }

    return NextResponse.json({
      _id: String(template._id),
      name: template.name,
      description: template.description,
      tags: template.tags,
      isPublished: template.isPublished,
      publishedSlug: template.publishedSlug,
      cloneCount: template.cloneCount,
      fields: template.fields,
    });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Removes one of the writer's own page layouts. Today's page can't go (switch first), and the
 * pages written with this one keep their questions and answers: each saved page holds its own.
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ templateId: string }> }) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { templateId } = await ctx.params;
    if (!mongoose.isObjectIdOrHexString(templateId)) return jsonError("Not found", 404);
    await connectDB();
    const user = await User.findById(session.user.id).select("activeTemplateId").lean();
    if (user?.activeTemplateId && String(user.activeTemplateId) === templateId) {
      return jsonError("That’s today’s page. Switch to another one first.", 409);
    }
    const res = await Template.deleteOne({ _id: templateId, userId: session.user.id });
    if (!res.deletedCount) return jsonError("Not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
