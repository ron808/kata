import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import { TemplateUpsertSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { PAGES_MOST, myPages, roomForPage } from "@/lib/templates/mine";

const FULL = `You can keep ${PAGES_MOST} pages. Delete one in Your pages to make another.`;

/** The writer's own pages, today's first. */
export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    return NextResponse.json({ pages: await myPages(session.user.id) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    if (!(await checkLimit(limiters.general, `templates:${session.user.id}`)).ok) return jsonError("That’s a lot of saving. Try again in a minute.", 429);

    const body = await request.json();
    const data = TemplateUpsertSchema.parse(body);
    if (!data._id && !(await roomForPage(session.user.id))) return jsonError(FULL, 409);

    let template;
    if (data._id) {
      template = await Template.findOneAndUpdate(
        { _id: data._id, userId: session.user.id },
        {
          $set: {
            name: data.name,
            description: data.description,
            tags: data.tags,
            fields: data.fields,
          },
        },
        { new: true }
      );
      if (!template) return jsonError("Not found", 404);
    } else {
      template = await Template.create({
        userId: session.user.id,
        name: data.name,
        description: data.description,
        tags: data.tags,
        fields: data.fields,
      });
      await User.findByIdAndUpdate(session.user.id, {
        activeTemplateId: template._id,
      });
    }

    return NextResponse.json({
      _id: String(template._id),
      name: template.name,
    });
  } catch (err) {
    return handleError(err);
  }
}
