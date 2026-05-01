import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { handleError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") ?? 24)));

    const filter = { isPublished: true };
    const total = await Template.countDocuments(filter);
    const templates = await Template.find(filter)
      .sort({ cloneCount: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      total,
      page,
      limit,
      templates: templates.map((t) => ({
        _id: String(t._id),
        name: t.name,
        description: t.description,
        tags: t.tags,
        cloneCount: t.cloneCount,
        publishedSlug: t.publishedSlug,
        fieldCount: t.fields.length,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
