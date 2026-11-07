"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/shared/Button";
import { FormAlert, TextField } from "@/components/shared/TextField";
import { PasswordField } from "./PasswordField";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

/** Name, email and password. What you do is asked once, by Kata, in onboarding. */
export function RegisterForm({ follow = null }: { follow?: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Tell Maru what to call you.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "That doesn’t look like an email address.";
    if (password.length < 8) errs.password = "Use at least 8 characters.";
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const errs = validate();
    setFieldErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length > 0) {
      document.getElementById(`reg-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, timezone }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data.error ?? "Couldn’t create your account. Try again.";
        if (res.status === 409) {
          setFieldErrors({ email: `${msg} Log in instead?` });
          document.getElementById("reg-email")?.focus();
        } else {
          setFormError(msg);
        }
        setLoading(false);
        return;
      }
      const signin = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (signin?.error) {
        setFormError("Your account is ready, but signing in failed. Log in to carry on.");
        setLoading(false);
        return;
      }
      router.push(follow ? `/onboarding?follow=${follow}` : "/onboarding");
    } catch {
      setFormError("Something went wrong. Try again in a moment.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <TextField
        id="reg-name"
        label="Name"
        autoComplete="name"
        required
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        hint="Your first name is plenty."
      />
      <TextField
        id="reg-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <PasswordField
        id="reg-password"
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={120}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        hint="At least 8 characters."
      />
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
