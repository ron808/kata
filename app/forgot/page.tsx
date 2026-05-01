import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { ForgotForm } from "@/components/auth/ForgotForm";

export default function ForgotPage() {
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
            Reset password
          </p>
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">
            Forgot it.
          </h1>
          <p className="text-text-secondary mt-3 text-[15px] leading-[1.65]">
            Enter the email you signed up with — we&apos;ll send you a link to
            choose a new password.
          </p>
          <div className="mt-10">
            <ForgotForm />
          </div>
          <p className="text-sm text-text-muted text-center mt-8">
            Remembered it?{" "}
            <Link
              href="/login"
              className="text-accent hover:text-accent-hover font-serif italic text-base"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
