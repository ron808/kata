"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldRenderer } from "./FieldRenderer";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";
import { countWords } from "@/lib/utils/streaks";
import { formatLongDate } from "@/lib/utils/dates";
import type {
  EntryField,
  FieldValue,
  Template,
  TemplateField,
} from "@/lib/types";

interface EntryFormProps {
  template: Template;
  initialFields?: EntryField[];
  entryId?: string;
  date?: string;
}

function valueForField(
  field: TemplateField,
  initial?: EntryField
): FieldValue {
  if (initial) return initial.value as FieldValue;
  switch (field.type) {
    case "tags":
      return [];
    case "yes_no":
      return null;
    case "mood_slider":
    case "energy":
    case "number":
    case "rating":
      return null;
    default:
      return "";
  }
}

export function EntryForm({
  template,
  initialFields,
  entryId,
  date,
}: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(
      template.fields.map((f) => [
        f.id,
        valueForField(f, initialFields?.find((x) => x.fieldId === f.id)),
      ])
    )
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef<string>("");

  const wordCount = useMemo(() => {
    let total = 0;
    for (const f of template.fields) {
      const v = values[f.id];
      if (typeof v === "string") total += countWords(v);
    }
    return total;
  }, [values, template.fields]);

  const readMins = Math.max(1, Math.round(wordCount / 220));

  function setValue(id: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  // auto-save every 10s when there are changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSave({ silent: true });
    }, 10_000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  async function doSave(opts: { silent?: boolean; redirectAfter?: boolean } = {}) {
    if (saving) return;
    const payload = {
      date,
      fields: template.fields.map<EntryField>((f) => ({
        fieldId: f.id,
        type: f.type,
        label: f.label,
        value: values[f.id] ?? null,
      })),
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSerialized.current && opts.silent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      lastSerialized.current = serialized;
      setSavedAt(Date.now());
      if (!opts.silent) toast("Entry saved", "success");
      if (opts.redirectAfter) {
        setTimeout(() => router.push("/dashboard"), 600);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      if (!opts.silent) toast(msg, "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative max-w-[720px] mx-auto px-6 pt-12 pb-40">
      {/* Top: paper-style page header */}
      <div className="flex items-start justify-between mb-12 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono">
            <span className="numeral text-accent text-base not-italic">№</span>
            <span>{entryId ? "Today's page · editing" : "Today's page · new"}</span>
          </div>
          <h1 className="font-serif italic text-5xl mt-3 leading-[1.05] tracking-tight">
            {formatLongDate(new Date())}
          </h1>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-text-muted hover:text-accent transition-colors text-sm font-mono uppercase tracking-[0.18em] mt-2"
        >
          ✕ exit
        </button>
      </div>

      {/* Saved indicator */}
      <div className="absolute top-14 right-6 h-5">
        {savedAt && (
          <motion.div
            key={savedAt}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-[11px] text-success font-mono uppercase tracking-[0.22em]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Saved
          </motion.div>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-10">
        {template.fields.map((field, idx) => (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.05 * idx }}
            className="space-y-3"
          >
            {field.type !== "divider" && (
              <label className="block text-[10.5px] uppercase tracking-[0.22em] font-mono text-text-muted">
                {field.label}
                {field.required && (
                  <span className="text-accent ml-1.5">*</span>
                )}
              </label>
            )}
            <FieldRenderer
              field={field}
              value={values[field.id]}
              onChange={(v) => setValue(field.id, v)}
            />
          </motion.div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-20 bg-bg-base/90 backdrop-blur-md border-t border-border">
        <div className="max-w-[720px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[11px] text-text-muted font-mono uppercase tracking-[0.22em]">
            <span><span className="text-accent">{wordCount.toLocaleString()}</span> words</span>
            <span>·</span>
            <span>{readMins} min read</span>
          </div>
          <Button
            onClick={() => doSave({ redirectAfter: true })}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}
