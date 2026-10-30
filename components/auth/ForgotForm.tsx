"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { FormAlert, TextField } from "@/components/shared/TextField";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn’t send the link. Try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="text-center">
        <span data-hue="4" className="mx-auto grid h-16 w-16 rotate-[-6deg] place-items-center rounded-full border-2 border-edge bg-hue text-on-hue shadow-sticker-sm">
          <Icon name="letter" className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <p className="mt-5 font-display text-display-s">Check your inbox.</p>
        <p className="mt-3 text-ink/75">
          If <span className="font-semibold text-ink [overflow-wrap:anywhere]">{email.trim()}</span> has an account, a link to
          choose a new password is on its way. It works for 30 minutes.
        </p>
        <p className="mt-3 text-sm text-ink/65">Nothing yet? Check spam, or try again in a few minutes.</p>
        <Button variant="secondary" className="mt-6" onClick={() => setDone(false)}>
          Use another email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <TextField
        id="forgot-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
