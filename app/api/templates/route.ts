import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import { TemplateUpsertSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requireUser } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();

    const body = await request.json();
    const data = TemplateUpsertSchema.parse(body);

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
