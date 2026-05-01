"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Request failed");
      }
      setDone(true);
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
        className="border border-border bg-bg-surface/60 px-4 py-4 text-[15px] text-text-secondary leading-[1.65]"
      >
        If <span className="text-text-primary">{email}</span> matches an account,
        a reset link is on its way. The link is valid for 30 minutes.
        <p className="text-[12px] text-text-muted font-mono uppercase tracking-[0.18em] mt-3">
          Don&apos;t see it? Check spam, or try again in a few minutes.
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
          htmlFor="forgot-email"
          className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2"
        >
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif text-text-primary focus:border-accent transition-colors"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
