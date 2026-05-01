import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
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
