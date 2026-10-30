import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Template, type ITemplate } from "@/lib/db/models/Template";
import { Builder } from "@/components/builder/Builder";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import type { Template as TemplateT } from "@/lib/types";

export const metadata = { title: "Your daily page · Kata" };

/** The writer's active page, created from a one-question starter if they have none yet. */
async function loadActive(userId: string): Promise<ITemplate | null> {
  await connectDB();
  const user = await User.findById(userId).select("activeTemplateId").lean();
  const active = user?.activeTemplateId ? await Template.findById(user.activeTemplateId).lean() : null;
  if (active) return active;

  const created = await Template.create({
    userId,
    name: "My daily page",
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
  await User.findByIdAndUpdate(userId, { activeTemplateId: created._id });
  return Template.findById(created._id).lean();
}

export default async function TemplateBuilderPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let doc: ITemplate | null = null;
  let dbError: string | null = null;
  try {
    doc = await loadActive(session.user.id);
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database unavailable";
  }
  if (!doc) return <DbNotConfigured error={dbError} />;

  const template: TemplateT = {
    _id: String(doc._id),
    name: doc.name,
    description: doc.description,
    isPublished: doc.isPublished,
    publishedSlug: doc.publishedSlug,
    cloneCount: doc.cloneCount,
    clonedFrom: doc.clonedFrom ? String(doc.clonedFrom) : null,
    tags: doc.tags,
    fields: [...(doc.fields ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((f) => ({
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
