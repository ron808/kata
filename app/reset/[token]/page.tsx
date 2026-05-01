import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { ResetForm } from "@/components/auth/ResetForm";

export default async function ResetPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 h-16 flex items-center border-b border-border/60">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
      </header>
      <div className="flex-1 grid place-items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono mb-3">
            New password
          </p>
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">
            Choose a new<br />
            <em className="text-accent">password.</em>
          </h1>
          <p className="text-text-secondary mt-3 text-[15px] leading-[1.65]">
            Pick something you can remember — at least 8 characters.
          </p>
          <div className="mt-10">
            <ResetForm token={token} />
          </div>
          <p className="text-sm text-text-muted text-center mt-8">
            <Link
              href="/login"
              className="text-text-muted hover:text-accent transition-colors"
            >
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
