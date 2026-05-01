import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { CloneButton } from "@/components/templates/CloneButton";

export default async function TemplateGalleryPage() {
  await auth();
  await connectDB();
  const templates = await Template.find({ isPublished: true })
    .sort({ cloneCount: -1, updatedAt: -1 })
    .limit(48)
    .lean();

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-text-muted font-mono">
          Template gallery
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          Steal someone else&apos;s ritual.
        </h1>
        <p className="text-text-secondary mt-2 max-w-xl text-sm">
          Browse public templates. Clone any of them in one click — you can
          edit every field afterwards.
        </p>
      </header>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-surface/50 p-12 text-center">
          <p className="text-text-secondary">
            No public templates yet — be the first to publish one!
          </p>
          <Link
            href="/settings/template"
            className="inline-block mt-3 text-accent hover:text-accent-hover text-sm"
          >
            Build your template →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={String(t._id)}
              className="rounded-2xl border border-border bg-bg-surface p-5 flex flex-col gap-3 hover:border-border-strong transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.name}</span>
                <span className="text-xs text-text-muted font-mono">
                  ↻ {t.cloneCount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-text-secondary line-clamp-3 flex-1">
                {t.description || "No description."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {t.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-md px-2 py-0.5 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <CloneButton templateId={String(t._id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
