"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/shared/Button";
import { FormAlert, TextField } from "@/components/shared/TextField";
import { PasswordField } from "./PasswordField";

/** `next` is where to go after signing in: an in-app path, already checked by the page. */
export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setFormError("Enter your email and password.");
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setFormError("That email and password don’t match. Try again, or reset your password.");
        setLoading(false);
        return;
      }
      router.push(next);
    } catch {
      setFormError("Something went wrong. Try again in a moment.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <TextField
        id="login-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div>
        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="mt-1 flex justify-end">
          <Link href="/forgot" className="link -mr-1 inline-flex min-h-11 items-center px-1 text-sm font-medium text-ink/70">
            Forgot your password?
          </Link>
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
