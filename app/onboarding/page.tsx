import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { loadMe } from "@/lib/social/load";
import { formatDate } from "@/lib/utils/dates";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { INTEREST_TAGS } from "@/components/settings/interestTags";
import { buttonClass } from "@/components/shared/Button";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import { User } from "@/lib/db/models/User";
import { Logo } from "@/components/shared/Logo";

export const metadata: Metadata = { title: "Set up · Kata" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ follow?: string }> }) {
  const raw = (await searchParams).follow;
  // Came from someone's shared profile: setup ends there, so following them is the next tap.
  const follow = typeof raw === "string" && /^[a-z0-9_]{3,24}$/i.test(raw) ? raw.toLowerCase() : null;
  const after = follow ? `/u/${follow}` : "/dashboard";
  const session = await auth();
  if (!session?.user?.id) redirect("/login?from=/onboarding");

  let me: Awaited<ReturnType<typeof loadMe>> = null;
  try {
    me = await loadMe(session.user.id);
  } catch (err) {
    return <DbNotConfigured error={err instanceof Error ? err.message : null} />;
  }
  if (!me) redirect("/login");

  const first = (me.name || session.user.name || "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="min-h-svh px-margin">
      <header className="mx-auto flex h-[var(--header-h)] max-w-[80rem] items-center justify-between gap-4">
        <Link href="/" aria-label="Kata, home" className="-mx-1 flex min-h-11 items-center px-1">
          <Logo cut="ground" />
        </Link>
        <Link href={after} className={buttonClass({ variant: "quiet" })}>
          Skip for now
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-[80rem] pb-16 pt-[clamp(1rem,4svh,3rem)] lg:pb-24">
        <OnboardingFlow
          after={after}
          firstName={first}
          currentHandle={me.handle}
          suggestedHandle={me.suggestedHandle ?? null}
          isPublic={me.isPublic}
          interestTags={INTEREST_TAGS}
          hasPage={Boolean(await User.exists({ _id: session.user.id, activeTemplateId: { $ne: null } }))}
          today={formatDate(new Date(), "long", "UTC")}
        />
      </main>
    </div>
  );
}
