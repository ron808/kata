"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";
import { ROLE_PRESETS } from "@/lib/roles";

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("Custom");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
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
        throw new Error(data.error ?? "Registration failed");
      }
      const signin = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signin?.error) throw new Error("Could not sign in");
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "danger");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif focus:border-accent transition-colors"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif focus:border-accent transition-colors"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[16px] font-serif focus:border-accent transition-colors"
        />
        <span className="block text-xs text-text-muted mt-1">
          At least 8 characters.
        </span>
      </Field>
      <Field label="Starting role">
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
                onClick={() => setRole(value)}
                className={`text-left border px-3.5 py-3 transition-colors ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-border-strong"
                }`}
              >
                <div className={`text-sm ${active ? "font-serif italic text-base" : "font-medium"}`}>
                  <span className="font-mono mr-1.5">{p.emoji}</span>
                  {p.name}
                </div>
                <div className="text-[11px] text-text-muted truncate font-mono uppercase tracking-[0.18em] mt-1">
                  {p.description}
                </div>
              </button>
            );
          })}
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}
