import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 h-16 flex items-center border-b border-border/60">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <div className="flex-1 grid md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-between p-12 border-r border-border bg-bg-surface/40">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono">
            Volume one · sign in
          </p>
          <div>
            <p className="font-serif italic text-4xl leading-[1.15] text-text-primary max-w-md">
              &ldquo;The good kind of habit isn&apos;t loud — it&apos;s the quiet
              thing you keep showing up for.&rdquo;
            </p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono mt-6">
              — Kata, on Sunday
            </p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted">
            型 — form, structure, pattern
          </p>
        </div>

        <div className="grid place-items-center px-6 py-12">
          <div className="w-full max-w-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono mb-3">
              Sign in
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">
              Welcome back.
            </h1>
            <p className="text-text-secondary mt-3 text-[15px] leading-[1.65]">
              Pick up where you left off — your streak is waiting.
            </p>
            <div className="mt-10">
              <LoginForm />
            </div>
            <p className="text-sm text-text-muted text-center mt-8">
              New here?{" "}
              <Link href="/register" className="text-accent hover:text-accent-hover font-serif italic text-base">
                Begin volume one →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
