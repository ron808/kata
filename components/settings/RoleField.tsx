"use client";

import { useId, useState } from "react";
import { useToast } from "@/components/shared/Toast";
import { ROLE_PRESETS } from "@/lib/roles";

/** What fills their days, which changes when life does. It shows on their profile, and shapes Kata's questions. */
export function RoleField({ initial }: { initial: string }) {
  const { toast } = useToast();
  const id = useId();
  // Older accounts keep the wording they signed up with: "Job Seeker".
  const [role, setRole] = useState(() => ROLE_PRESETS.find((p) => p.name.toLowerCase() === initial.toLowerCase())?.name ?? initial);
  const [saving, setSaving] = useState(false);

  async function choose(next: string) {
    const before = role;
    setRole(next);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!res.ok) throw new Error();
      toast("Saved", "success");
    } catch {
      setRole(before);
      toast("That didn’t save. Try again.", "danger");
    } finally {
      setSaving(false);
    }
  }

  const known = ROLE_PRESETS.some((p) => p.name === role);
  return (
    <div className="rule mt-6 border-t-2 pt-5">
      <label htmlFor={id} className="block text-[0.9375rem] font-semibold">
        What fills your days
      </label>
      <select id={id} className="control mt-2" value={role} disabled={saving} onChange={(e) => choose(e.target.value)}>
        {known ? null : <option value={role}>{role}</option>}
        {ROLE_PRESETS.map((p) => (
          <option key={p.key} value={p.name}>
            {p.name === "Custom" ? "Don’t show it" : p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
