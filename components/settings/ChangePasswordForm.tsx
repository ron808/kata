"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";

type FieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirm", string>
>;

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errs, setErrs] = useState<FieldErrors>({});

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!currentPassword) e.currentPassword = "Required.";
    if (newPassword.length < 8) e.newPassword = "Use at least 8 characters.";
    if (newPassword === currentPassword && newPassword.length > 0)
      e.newPassword = "Pick something different from your current password.";
    if (newPassword !== confirm) e.confirm = "Passwords don't match.";
    return e;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const v = validate();
    setErrs(v);
    setFormError(null);
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data.error ?? "Could not change password.";
        if (/current password/i.test(msg)) {
          setErrs({ currentPassword: msg });
        } else {
          setFormError(msg);
        }
        return;
      }
      toast("Password updated", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setErrs({});
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="border border-danger/40 bg-danger/10 text-danger text-sm px-3.5 py-2.5 rounded-lg"
        >
          {formError}
        </div>
      )}
      <PwField
        label="Current password"
        id="cp-current"
        autoComplete="current-password"
        value={currentPassword}
        onChange={setCurrentPassword}
        error={errs.currentPassword}
      />
      <PwField
        label="New password"
        id="cp-new"
        autoComplete="new-password"
        value={newPassword}
        onChange={setNewPassword}
        error={errs.newPassword}
        hint="At least 8 characters."
      />
      <PwField
        label="Confirm new password"
        id="cp-confirm"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        error={errs.confirm}
      />
      <div className="pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}

function PwField({
  label,
  id,
  autoComplete,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  id: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
}) {
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2"
      >
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : hint ? hintId : undefined}
        className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif text-text-primary focus:border-accent transition-colors"
      />
      {error ? (
        <span id={errId} role="alert" className="block text-xs text-danger mt-1.5">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="block text-xs text-text-muted mt-1.5">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
