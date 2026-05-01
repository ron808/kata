import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { Template } from "@/lib/db/models/Template";
import { FieldRenderer } from "@/components/entry/FieldRenderer";
import { formatLongDate, isoDay, todayUtcMidnight } from "@/lib/utils/dates";
import type { TemplateField } from "@/lib/types";

export default async function ViewEntryPage(props: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const entry = await Entry.findOne({
    _id: entryId,
    userId: session.user.id,
  }).lean();
  if (!entry) notFound();

  const template = await Template.findById(entry.templateId).lean();

  const isToday = isoDay(entry.date) === isoDay(todayUtcMidnight());

  return (
    <div className="max-w-[680px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-text-muted font-mono">
            Entry
          </div>
          <h1 className="text-2xl font-semibold mt-1">
            {formatLongDate(entry.date)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isToday && (
            <Link
              href="/entry/new"
              className="text-sm text-accent hover:text-accent-hover"
            >
              Edit →
            </Link>
          )}
          <Link
            href="/history"
            className="text-text-muted hover:text-text-primary text-sm"
          >
            ← History
          </Link>
        </div>
      </div>

      <div className="space-y-7">
        {entry.fields.map((f, i) => {
          const tplField = template?.fields.find((tf) => tf.id === f.fieldId);
          const field: TemplateField = tplField
            ? {
                id: tplField.id,
                type: tplField.type,
                label: tplField.label,
                required: tplField.required,
                order: tplField.order,
                config: tplField.config as Record<string, unknown>,
              }
            : {
                id: f.fieldId,
                type: f.type as TemplateField["type"],
                label: f.label,
                required: false,
                order: i,
                config: {},
              };
          return (
            <div key={f.fieldId} className="space-y-2">
              {field.type !== "divider" && (
                <label className="block text-sm font-medium text-text-secondary">
                  {field.label}
                </label>
              )}
              <FieldRenderer
                field={field}
                value={f.value as never}
                onChange={() => {}}
                readOnly
              />
            </div>
          );
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-border text-xs text-text-muted font-mono flex items-center gap-3">
        <span>{entry.wordCount.toLocaleString()} words</span>
        {entry.tags.length > 0 && (
          <>
            <span>·</span>
            <span>{entry.tags.join(", ")}</span>
          </>
        )}
      </div>
    </div>
  );
}
