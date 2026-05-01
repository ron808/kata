import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import { handleError, jsonError, requireUser } from "@/lib/api";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ templateId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { templateId } = await ctx.params;
    await connectDB();

    const source = await Template.findById(templateId).lean();
    if (!source) return jsonError("Not found", 404);
    if (!source.isPublished && String(source.userId) !== session.user.id) {
      return jsonError("Forbidden", 403);
    }

    const cloned = await Template.create({
      userId: session.user.id,
      name: source.name,
      description: source.description,
      tags: source.tags,
      fields: source.fields,
      clonedFrom: source._id,
    });

    if (String(source.userId) !== session.user.id) {
      await Template.findByIdAndUpdate(source._id, {
        $inc: { cloneCount: 1 },
      });
    }

    await User.findByIdAndUpdate(session.user.id, {
      activeTemplateId: cloned._id,
    });

    return NextResponse.json({ _id: String(cloned._id) });
  } catch (err) {
    return handleError(err);
  }
}
