import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { Logo } from "@/components/shared/Logo";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 h-14 flex items-center justify-between border-b border-border/60">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Link
          href="/dashboard"
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Skip for now →
        </Link>
      </header>
      <main className="flex-1 px-6 py-10">
        <OnboardingFlow userRole={session.user.role} />
      </main>
    </div>
  );
}
