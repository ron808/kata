"use client";

import { useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TemplateField } from "@/lib/types";

export function TagField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: string[];
  onChange: (v: string[]) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const allowed = (field.config.allowedTags as string[] | undefined) ?? [];
  const list = value ?? [];

  function add(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || list.includes(t)) return;
    onChange([...list, t]);
    setDraft("");
  }
  function remove(tag: string) {
    onChange(list.filter((t) => t !== tag));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && list.length) {
      remove(list[list.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 bg-bg-elevated/40 border border-border rounded-lg px-2.5 py-2 min-h-[44px] focus-within:border-accent transition-colors">
        <AnimatePresence>
          {list.map((tag) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1 rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-xs text-accent font-mono"
            >
              {tag}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  className="text-accent/60 hover:text-accent text-[10px]"
                  aria-label={`Remove ${tag}`}
                >
                  ✕
                </button>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
        {!readOnly && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => draft && add(draft)}
            placeholder={list.length ? "" : "Add a tag…"}
            className="flex-1 min-w-[80px] bg-transparent border-0 px-1.5 py-0.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0 focus:shadow-none"
          />
        )}
      </div>
      {!readOnly && allowed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allowed
            .filter((t) => !list.includes(t))
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => add(t)}
                className="text-xs text-text-secondary hover:text-text-primary border border-border hover:border-border-strong rounded-md px-2 py-0.5 transition-colors"
              >
                + {t}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
