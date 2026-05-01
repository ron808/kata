import { redirect, unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Template } from "@/lib/db/models/Template";
import { Entry } from "@/lib/db/models/Entry";
import { todayUtcMidnight, isoDay } from "@/lib/utils/dates";
import { EntryForm } from "@/components/entry/EntryForm";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import type { Template as TemplateT, EntryField } from "@/lib/types";

export default async function NewEntryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let template: TemplateT | null = null;
  let initialFields: EntryField[] | undefined;
  let entryId: string | undefined;
  let dbError: string | null = null;
  let needsOnboarding = false;

  try {
    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user?.activeTemplateId) {
      needsOnboarding = true;
    } else {
      const tpl = await Template.findById(user.activeTemplateId).lean();
      if (!tpl) {
        needsOnboarding = true;
      } else {
        template = {
          _id: String(tpl._id),
          name: tpl.name,
          description: tpl.description,
          isPublished: tpl.isPublished,
          publishedSlug: tpl.publishedSlug,
          cloneCount: tpl.cloneCount,
          clonedFrom: tpl.clonedFrom ? String(tpl.clonedFrom) : null,
          tags: tpl.tags,
          fields: (tpl.fields ?? []).map((f) => ({
            id: f.id,
            type: f.type,
            label: f.label,
            required: f.required,
            order: f.order,
            config: f.config as Record<string, unknown>,
          })),
        };
        const today = todayUtcMidnight();
        const existing = await Entry.findOne({
          userId: session.user.id,
          date: today,
        }).lean();
        if (existing) {
          initialFields = (existing.fields ?? []).map((f) => ({
            fieldId: f.fieldId,
            type: f.type as EntryField["type"],
            label: f.label,
            value: f.value as EntryField["value"],
          }));
          entryId = String(existing._id);
        }
      }
    }
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Error) dbError = err.message;
  }

  if (needsOnboarding) redirect("/onboarding");
  if (!template) return <DbNotConfigured error={dbError} />;

  return (
    <EntryForm
      template={template}
      initialFields={initialFields}
      entryId={entryId}
      date={isoDay(todayUtcMidnight())}
    />
  );
}
