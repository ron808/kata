import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Template } from "@/lib/db/models/Template";
import { PublishToggle } from "@/components/settings/PublishToggle";

export default async function SettingsPage() {
  const session = await auth();
  await connectDB();
  const user = await User.findById(session!.user.id).lean();
  const template = user?.activeTemplateId
    ? await Template.findById(user.activeTemplateId).lean()
    : null;

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">
      <header>
        <div className="text-xs uppercase tracking-widest text-text-muted font-mono">
          Settings
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          Your Kata
        </h1>
      </header>

      <Section title="Profile">
        <Row label="Name" value={user?.name ?? "—"} />
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Role" value={user?.role ?? "Custom"} />
        <Row label="Timezone" value={user?.timezone ?? "UTC"} mono />
      </Section>

      <Section title="Active template">
        {template ? (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold text-lg">{template.name}</div>
                <div className="text-sm text-text-secondary mt-0.5">
                  {template.description || "No description"}
                </div>
                <div className="text-xs text-text-muted font-mono mt-2">
                  {template.fields.length} fields
                </div>
              </div>
              <Link
                href="/settings/template"
                className="text-sm text-accent hover:text-accent-hover whitespace-nowrap"
              >
                Edit template →
              </Link>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <PublishToggle
                templateId={String(template._id)}
                isPublished={template.isPublished}
                publishedSlug={template.publishedSlug}
              />
            </div>
          </>
        ) : (
          <div className="text-text-secondary text-sm">
            No active template.{" "}
            <Link href="/onboarding" className="text-accent">
              Pick one →
            </Link>
          </div>
        )}
      </Section>

      <Section title="Stats">
        <Row label="Total entries" value={String(user?.totalEntries ?? 0)} mono />
        <Row label="Total words" value={(user?.totalWords ?? 0).toLocaleString()} mono />
        <Row label="Current streak" value={`${user?.streak ?? 0} days`} mono />
        <Row label="Longest streak" value={`${user?.longestStreak ?? 0} days`} mono />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm uppercase tracking-widest text-text-muted font-mono mb-3">
        {title}
      </h2>
      <div className="rounded-2xl border border-border bg-bg-surface p-5 space-y-3">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span
        className={`text-text-primary ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
