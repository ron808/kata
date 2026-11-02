import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import type { ITemplate } from "@/lib/db/models/Template";
import { ensurePage } from "@/lib/templates/mine";
import { Builder } from "@/components/builder/Builder";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import type { Template as TemplateT } from "@/lib/types";

export const metadata = { title: "Your daily page · Kata" };

export default async function TemplateBuilderPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let doc: ITemplate | null = null;
  let dbError: string | null = null;
  try {
    doc = await (await connectDB(), ensurePage(session.user.id));
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
