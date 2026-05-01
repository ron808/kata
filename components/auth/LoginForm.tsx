"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/shared/Button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setFormError("That email or password didn't match. Try again.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="border border-danger/40 bg-danger/10 text-danger text-sm px-3.5 py-2.5"
        >
          {formError}
        </div>
      )}
      <Field label="Email" htmlFor="login-email">
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif text-text-primary focus:border-accent transition-colors"
        />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif text-text-primary focus:border-accent transition-colors"
        />
      </Field>
      <div className="flex justify-end -mt-1">
        <Link
          href="/forgot"
          className="text-[12px] text-text-muted hover:text-accent font-mono uppercase tracking-[0.18em] transition-colors"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
