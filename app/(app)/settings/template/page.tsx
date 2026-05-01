import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Template } from "@/lib/db/models/Template";
import { Builder } from "@/components/builder/Builder";
import type { Template as TemplateT } from "@/lib/types";

export default async function TemplateBuilderPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await connectDB();
  const user = await User.findById(session.user.id).lean();
  let templateDoc = user?.activeTemplateId
    ? await Template.findById(user.activeTemplateId).lean()
    : null;

  // If user has no template at all, create a starter
  if (!templateDoc) {
    const created = await Template.create({
      userId: session.user.id,
      name: "My daily template",
      description: "",
      tags: [],
      fields: [
        {
          id: nanoid(8),
          type: "long_text",
          label: "How was today?",
          required: true,
          order: 0,
          config: { placeholder: "Write whatever feels right." },
        },
      ],
    });
    await User.findByIdAndUpdate(session.user.id, {
      activeTemplateId: created._id,
    });
    templateDoc = await Template.findById(created._id).lean();
  }

  const template: TemplateT = {
    _id: String(templateDoc!._id),
    name: templateDoc!.name,
    description: templateDoc!.description,
    isPublished: templateDoc!.isPublished,
    publishedSlug: templateDoc!.publishedSlug,
    cloneCount: templateDoc!.cloneCount,
    clonedFrom: templateDoc!.clonedFrom ? String(templateDoc!.clonedFrom) : null,
    tags: templateDoc!.tags,
    fields: (templateDoc!.fields ?? []).map((f) => ({
      id: f.id,
      type: f.type,
      label: f.label,
      required: f.required,
      order: f.order,
      config: (f.config as Record<string, unknown>) ?? {},
    })),
  };

  return <Builder initial={template} />;
}
