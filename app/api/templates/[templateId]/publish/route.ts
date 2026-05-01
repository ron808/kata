import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { handleError, jsonError, requireUser } from "@/lib/api";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ templateId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { templateId } = await ctx.params;
    await connectDB();

    const template = await Template.findOne({
      _id: templateId,
      userId: session.user.id,
    });
    if (!template) return jsonError("Not found", 404);

    if (template.isPublished) {
      template.isPublished = false;
      template.publishedSlug = null;
      await template.save();
      return NextResponse.json({ isPublished: false, publishedSlug: null });
    }

    const base = slugify(template.name) || "template";
    const slug = `${base}-${nanoid(6).toLowerCase()}`;
    template.isPublished = true;
    template.publishedSlug = slug;
    await template.save();

    return NextResponse.json({ isPublished: true, publishedSlug: slug });
  } catch (err) {
    return handleError(err);
  }
}
