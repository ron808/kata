"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { FormAlert } from "@/components/shared/TextField";
import { PasswordField } from "./PasswordField";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ password?: string; confirm?: string }>({});

  // Once it's saved, carry on to log in after a moment.
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => router.push("/login"), 2200);
    return () => window.clearTimeout(t);
  }, [done, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const errs: typeof fieldError = {};
    if (password.length < 8) errs.password = "Use at least 8 characters.";
    else if (password !== confirm) errs.confirm = "These don’t match yet.";
    setFieldError(errs);
    setError(null);
    if (Object.keys(errs).length > 0) {
      document.getElementById(errs.password ? "reset-password" : "reset-confirm")?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn’t update your password. Ask for a new link and try again.");
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
        <span className="mx-auto grid h-16 w-16 rotate-[-6deg] place-items-center rounded-full border-2 border-edge bg-sun text-on-sun shadow-sticker-sm">
          <Icon name="check" className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <p className="mt-5 font-display text-display-s">Password updated.</p>
        <p className="mt-3 text-ink/75">Taking you to log in.</p>
        <Link href="/login" className="link mt-2 inline-flex min-h-11 items-center font-semibold">
          Go now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? (
        <FormAlert>
          {error}{" "}
          <Link href="/forgot" className="link font-semibold">
            Get a new link
          </Link>
        </FormAlert>
      ) : null}
      <PasswordField
        id="reset-password"
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={120}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldError.password}
        hint="At least 8 characters."
      />
      <PasswordField
        id="reset-confirm"
        label="Type it again"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={120}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={fieldError.confirm}
      />
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
