import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
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
            Volume one · begin
          </p>
          <div className="space-y-6">
            <p className="font-serif text-5xl leading-[1.05] tracking-tight">
              A small page,<br/>
              <em className="text-accent">every day.</em>
            </p>
            <ul className="space-y-3 text-text-secondary text-[15px]">
              <li className="flex gap-3"><span className="numeral text-accent">i.</span> Pick a role-shaped starter form</li>
              <li className="flex gap-3"><span className="numeral text-accent">ii.</span> Write one entry per day, free form</li>
              <li className="flex gap-3"><span className="numeral text-accent">iii.</span> Receive a quiet letter each Sunday</li>
            </ul>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted">
            型 — form, structure, pattern
          </p>
        </div>

        <div className="grid place-items-center px-6 py-12">
          <div className="w-full max-w-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono mb-3">
              New account
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">
              Begin your<br/>
              <em className="text-accent">volume one.</em>
            </h1>
            <p className="text-text-secondary mt-4 text-[15px] leading-[1.65]">
              Pick a starting role — you can change every field afterwards.
            </p>
            <div className="mt-10">
              <RegisterForm />
            </div>
            <p className="text-sm text-text-muted text-center mt-8">
              Already writing?{" "}
              <Link href="/login" className="text-accent hover:text-accent-hover font-serif italic text-base">
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
