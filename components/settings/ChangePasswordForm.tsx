"use client";

import { useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/shared/Button";
import { FormAlert } from "@/components/shared/TextField";
import { useToast } from "@/components/shared/Toast";

type FieldErrors = Partial<Record<"currentPassword" | "newPassword" | "confirm", string>>;

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
    if (!currentPassword) e.currentPassword = "Enter your current password.";
    if (newPassword.length < 8) e.newPassword = "Use at least 8 characters.";
    else if (newPassword === currentPassword) e.newPassword = "Pick something different from your current password.";
    if (!e.newPassword && newPassword !== confirm) e.confirm = "These don’t match yet.";
    return e;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const v = validate();
    setErrs(v);
    setFormError(null);
    const first = (["currentPassword", "newPassword", "confirm"] as const).find((k) => v[k]);
    if (first) {
      document.getElementById({ currentPassword: "cp-current", newPassword: "cp-new", confirm: "cp-confirm" }[first])?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = data.error ?? "Couldn’t change your password. Try again.";
        if (/current password/i.test(msg)) {
          setErrs({ currentPassword: msg });
          document.getElementById("cp-current")?.focus();
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
      setFormError("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate aria-labelledby="password-title">
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <PasswordField
        id="cp-current"
        label="Current password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        error={errs.currentPassword}
      />
      <PasswordField
        id="cp-new"
        label="New password"
        autoComplete="new-password"
        maxLength={120}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={errs.newPassword}
        hint="At least 8 characters."
      />
      <PasswordField
        id="cp-confirm"
        label="Type it again"
        autoComplete="new-password"
        maxLength={120}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errs.confirm}
      />
      <Button type="submit" variant="secondary" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
