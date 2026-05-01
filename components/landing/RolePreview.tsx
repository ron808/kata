"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ROLE_PRESETS } from "@/lib/roles";
import { FieldRenderer } from "@/components/entry/FieldRenderer";
import type { TemplateField } from "@/lib/types";

export function RolePreview() {
  const presets = ROLE_PRESETS.filter((r) => r.key !== "custom");
  const [activeKey, setActiveKey] = useState(presets[0].key);
  const active = presets.find((r) => r.key === activeKey)!;
  const fields: TemplateField[] = active.fields.map((f, i) => ({
    ...f,
    id: `${active.key}-${i}`,
    order: i,
  }));

  return (
    <section id="how" className="py-32 px-6 border-t border-border/60">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-12 gap-10 mb-12 items-end">
          <div className="md:col-span-7">
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono mb-3">
              Chapter II · Role-aware
            </div>
            <h2 className="font-serif text-5xl md:text-6xl tracking-tight leading-[1.02]">
              Built for the way <em className="text-accent">you</em> work.
            </h2>
          </div>
          <p className="md:col-span-5 text-text-secondary text-[16px] leading-[1.7]">
            Pick a starter that fits your role — or build your own form, block
            by block. Every day shows up the way you set it up. Toggle between
            roles to see how the daily page changes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-10 border-y border-border py-4">
          <span className="text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono">
            Try one
          </span>
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setActiveKey(p.key)}
              className={`text-base transition-colors relative ${
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
            className="bg-bg-surface border border-border max-w-[760px] mx-auto"
          >
            <div className="border-b border-border px-8 py-4 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono">
                Daily form
              </div>
              <div className="font-serif italic text-xl text-text-primary">
                {active.name}
              </div>
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
      </div>
    </section>
  );
}
