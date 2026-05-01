"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/shared/Button";
import { ROLE_PRESETS } from "@/lib/roles";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("Custom");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Tell us what to call you.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "That doesn't look like a valid email.";
    if (password.length < 8)
      errs.password = "Use at least 8 characters.";
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const errs = validate();
    setFieldErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          : "UTC";
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, timezone: tz }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data.error ?? "Registration failed";
        if (res.status === 409) {
          setFieldErrors({ email: msg });
        } else {
          setFormError(msg);
        }
        setLoading(false);
        return;
      }
      const signin = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signin?.error) {
        setFormError("Account created, but we couldn't sign you in. Try logging in.");
        setLoading(false);
        return;
      }
      router.push("/onboarding");
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
      <Field label="Name" htmlFor="reg-name" error={fieldErrors.name}>
        <input
          id="reg-name"
          autoComplete="name"
          required
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "reg-name-err" : undefined}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif focus:border-accent transition-colors"
        />
      </Field>
      <Field label="Email" htmlFor="reg-email" error={fieldErrors.email}>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "reg-email-err" : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif focus:border-accent transition-colors"
        />
      </Field>
      <Field
        label="Password"
        htmlFor="reg-password"
        error={fieldErrors.password}
        hint="At least 8 characters."
      >
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? "reg-password-err" : "reg-password-hint"
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif focus:border-accent transition-colors"
        />
      </Field>
      <fieldset>
        <legend className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2">
          Starting role
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_PRESETS.map((p) => {
            const value =
              p.key === "developer"
                ? "Developer"
                : p.key === "designer"
                ? "Designer"
                : p.key === "founder"
                ? "Founder"
                : p.key === "job_seeker"
                ? "Job Seeker"
                : p.key === "student"
                ? "Student"
                : "Custom";
            const active = role === value;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={active}
                onClick={() => setRole(value)}
                className={`text-left border px-3.5 py-3 transition-colors ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-border-strong"
                }`}
              >
                <div className={`text-sm ${active ? "font-serif italic text-base" : "font-medium"}`}>
                  <span className="font-mono mr-1.5" aria-hidden>
                    {p.emoji}
                  </span>
                  {p.name}
                </div>
                <div className="text-[11px] text-text-muted truncate font-mono uppercase tracking-[0.18em] mt-1">
                  {p.description}
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const errId = `${htmlFor}-err`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2"
      >
        {label}
      </label>
      {children}
      {error ? (
        <span
          id={errId}
          role="alert"
          className="block text-xs text-danger mt-1.5"
        >
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="block text-xs text-text-muted mt-1">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
