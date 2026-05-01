"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ROLE_PRESETS, presetByKey } from "@/lib/roles";
import { FieldRenderer } from "@/components/entry/FieldRenderer";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";
import type { TemplateField, RoleKey } from "@/lib/types";
import { nanoid } from "nanoid";

export function OnboardingFlow({ userRole }: { userRole?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const initialKey = (userRole?.toLowerCase().replace(" ", "_") ?? "custom") as RoleKey;
  const [activeKey, setActiveKey] = useState<RoleKey>(
    ROLE_PRESETS.some((r) => r.key === initialKey) ? initialKey : "developer"
  );
  const [saving, setSaving] = useState(false);

  const preset = presetByKey(activeKey);
  const fields: TemplateField[] = preset.fields.map((f, i) => ({
    ...f,
    id: nanoid(8),
    order: i,
  }));

  async function pickAndContinue(redirectTo: string) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${preset.name} starter`,
          description: preset.description,
          tags: [],
          fields,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not save template");
      }
      router.push(redirectTo);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "danger");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono">
          Chapter I · pick your shape
        </div>
        <h1 className="font-serif text-5xl md:text-6xl mt-4 tracking-tight leading-[1.02]">
          What does your <em className="text-accent">day</em> look like?
        </h1>
        <p className="text-text-secondary mt-4 max-w-xl mx-auto text-[15px] leading-[1.7]">
          Pick a starter — you can edit any field, add new ones, or build from
          scratch later in settings.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-10 border-y border-border py-4 max-w-3xl mx-auto">
        <span className="text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono">
          Pick one
        </span>
        {ROLE_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setActiveKey(p.key)}
            className={`text-base transition-colors ${
              activeKey === p.key
                ? "text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="font-mono mr-2 text-sm">{p.emoji}</span>
            <span className={activeKey === p.key ? "italic font-serif text-xl" : ""}>
              {p.name}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="border border-border bg-bg-surface max-w-[720px] mx-auto"
        >
          <div className="border-b border-border px-8 py-4 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono">
              Daily form preview
            </div>
            <div className="font-serif italic text-xl">{preset.name}</div>
          </div>
          <div className="p-8 space-y-7">
            {fields.map((field, i) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: 0.05 * i }}
                className="space-y-2"
              >
                {field.type !== "divider" && (
                  <label className="block text-[11px] uppercase tracking-[0.22em] font-mono text-text-muted">
                    {field.label}
                  </label>
                )}
                <FieldRenderer
                  field={field}
                  value={field.type === "tags" ? [] : ""}
                  onChange={() => {}}
                  readOnly
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => pickAndContinue("/settings/template")}
          disabled={saving}
        >
          Use this & customize
        </Button>
        <Button
          size="lg"
          onClick={() => pickAndContinue("/dashboard")}
          disabled={saving}
        >
          {saving ? "Saving…" : "Looks great — let's start →"}
        </Button>
      </div>
    </div>
  );
}
