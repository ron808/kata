import type { Metadata } from "next";
import { isGroqConfigured } from "@/lib/ai/groq";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import { namesFor } from "@/lib/companion/naming";
import { roleKeyOf } from "@/lib/questions/daily";
import { loadMe } from "@/lib/social/load";
import { FIELD_TYPE_META } from "@/components/builder/fieldTypes";
import { interestChoices, type CheckIn } from "@/components/onboarding/script";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { INTEREST_TAGS } from "@/components/settings/interestTags";
import { KataSettings } from "@/components/settings/KataSettings";
import { RoleField } from "@/components/settings/RoleField";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PublishToggle } from "@/components/settings/PublishToggle";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { AppPage, EmptyNote, PageHeader } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import { Icon } from "@/components/shared/Icon";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export const metadata: Metadata = { title: "Settings · Kata" };

async function load(userId: string) {
  await connectDB();
  const [me, user, { name }] = await Promise.all([
    loadMe(userId),
    User.findById(userId).select("email checkIn timezone activeTemplateId role").lean(),
    namesFor(userId),
  ]);
  const template = user?.activeTemplateId
    ? await Template.findOne({ _id: user.activeTemplateId, userId }).select("name description fields isPublished credit publishedSlug").lean()
    : null;
  return { me, user, template, name };
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?from=/settings");

  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(session.user.id);
  } catch (err) {
    return <DbNotConfigured error={err instanceof Error ? err.message : null} />;
  }
  const { me, user, template, name } = data;
  if (!me || !user) redirect("/login");

  const fields = template ? [...template.fields].sort((a, b) => a.order - b.order) : [];
  const interestOptions = interestChoices(roleKeyOf(user.role ?? "Custom"), INTEREST_TAGS, 16);

  return (
    <AppPage>
      <PageHeader title="Settings" lede={`Your profile, how ${name} checks in, and the page you fill in each day.`} />

      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:col-span-7">
          <Card id="profile" title="Profile" note="This is how people find you and what they see.">
            <ProfileForm
              initial={{ name: me.name, handle: me.handle, bio: me.bio, isPublic: me.isPublic }}
              hue={me.hue}
              suggestedHandle={me.suggestedHandle ?? null}
            />
            <RoleField initial={user.role ?? "Custom"} />
          </Card>

          <section id="kata" aria-labelledby="kata-title" className="card scroll-mt-20 p-5 sm:p-7">
            <KataSettings
              initialCheckIn={(user.checkIn ?? "morning") as CheckIn}
              initialInterests={me.interests}
              options={interestOptions}
              timezone={user.timezone || "UTC"}
              ai={isGroqConfigured()}
            />
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:col-span-5">
          <Card
            id="page"
            title="Your page"
            note="The questions you answer each day."
            action={
              template ? (
                <Link href="/settings/template" className={buttonClass({ variant: "secondary", className: "shrink-0" })}>
                  <Icon name="pen" className="h-4 w-4" />
                  Edit
                </Link>
              ) : null
            }
          >
            {template ? (
              <>
                <div className="well mt-5 p-4 sm:p-5">
                  <p className="font-display text-[1.45rem] leading-tight">{template.name}</p>
                  {template.description ? <p className="mt-1 text-sm text-ink/70">{template.description}</p> : null}
                  <ol aria-label={`${fields.length} questions`} className="mt-4 grid grid-cols-1 gap-2">
                    {fields.map((f) => {
                      const meta = FIELD_TYPE_META[f.type];
                      return (
                        <li key={f.id} className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            data-hue={meta?.hue ?? undefined}
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-edge ${
                              meta?.hue == null ? "bg-surface" : "bg-hue text-on-hue"
                            }`}
                          >
                            <Icon name={meta?.icon ?? "text-short"} className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                          <span className="min-w-0 font-medium leading-snug [overflow-wrap:anywhere]">
                            {f.type === "divider" ? (f.config?.sectionLabel as string) || "Section break" : f.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div className="rule mt-5 border-t-2 pt-5">
                  <PublishToggle
                    templateId={String(template._id)}
                    isPublished={template.isPublished}
                    credit={Boolean(template.credit)}
                    publishedSlug={template.publishedSlug}
                  />
                </div>
              </>
            ) : (
              <div className="mt-5">
                <EmptyNote
                  action={
                    <Link href="/onboarding" className={buttonClass({ variant: "secondary" })}>
                      Set it up with {name}
                    </Link>
                  }
                >
                  No daily page yet. {name} can set one up in a couple of minutes.
                </EmptyNote>
              </div>
            )}
          </Card>

          <Card id="appearance" title="Appearance" note="System follows your device’s light or dark setting.">
            {/* Full-height steps so each option is a comfortable tap on phones. */}
            <ThemeToggle className="mt-5 w-full [&_button]:min-h-11" />
          </Card>

          <Card id="account" title="Account">
            <dl className="mt-5 grid grid-cols-1 gap-3 text-[0.9375rem]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <dt className="text-ink/70">Email</dt>
                <dd className="min-w-0 font-medium [overflow-wrap:anywhere]">{user.email}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <dt className="text-ink/70">Time zone</dt>
                <dd className="min-w-0 font-medium">{(user.timezone || "UTC").replace(/_/g, " ")}</dd>
              </div>
            </dl>
            <div className="rule mt-6 border-t-2 pt-6">
              <h3 id="password-title" className="font-semibold">
                Change password
              </h3>
              <p className="mb-4 mt-1 text-sm text-ink/70">Kata checks your current one first.</p>
              <ChangePasswordForm />
            </div>
            <div className="rule mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 pt-6">
              <p className="text-sm text-ink/70">Done for now? Your pages will be here.</p>
              <SignOutButton />
            </div>
          </Card>
        </div>
      </div>
    </AppPage>
  );
}

function Card({
  id,
  title,
  note,
  action,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="card min-w-0 scroll-mt-20 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="font-display text-display-s">
            {title}
          </h2>
          {note ? <p className="mt-1.5 text-sm text-ink/70">{note}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
