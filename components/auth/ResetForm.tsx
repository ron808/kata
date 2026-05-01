"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{
    password?: string;
    confirm?: string;
  }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const errs: typeof fieldError = {};
    if (password.length < 8) errs.password = "Use at least 8 characters.";
    if (password !== confirm) errs.confirm = "Passwords don't match.";
    setFieldError(errs);
    setError(null);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Reset failed");
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-success/40 bg-success/10 px-4 py-4 text-[15px] leading-[1.65]"
      >
        <p className="text-success font-medium">Password updated.</p>
        <p className="text-text-secondary mt-2">
          Redirecting to sign-in…{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Go now →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="border border-danger/40 bg-danger/10 text-danger text-sm px-3.5 py-2.5"
        >
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="reset-password"
          className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2"
        >
          New password
        </label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(fieldError.password)}
          aria-describedby={fieldError.password ? "reset-password-err" : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif text-text-primary focus:border-accent transition-colors"
        />
        {fieldError.password && (
          <span
            id="reset-password-err"
            role="alert"
            className="block text-xs text-danger mt-1.5"
          >
            {fieldError.password}
          </span>
        )}
      </div>
      <div>
        <label
          htmlFor="reset-confirm"
          className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2"
        >
          Confirm password
        </label>
        <input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(fieldError.confirm)}
          aria-describedby={fieldError.confirm ? "reset-confirm-err" : undefined}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif text-text-primary focus:border-accent transition-colors"
        />
        {fieldError.confirm && (
          <span
            id="reset-confirm-err"
            role="alert"
            className="block text-xs text-danger mt-1.5"
          >
            {fieldError.confirm}
          </span>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
