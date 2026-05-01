"use client";

import type { FieldType } from "@/lib/types";
import { FIELD_TYPE_META, PALETTE_ORDER } from "./fieldTypes";

export function FieldPalette({
  onAdd,
}: {
  onAdd: (type: FieldType) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-4 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
      <div className="text-xs uppercase tracking-widest text-text-muted font-mono mb-3">
        Field types
      </div>
      <div className="grid gap-1.5">
        {PALETTE_ORDER.map((type) => {
          const meta = FIELD_TYPE_META[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onAdd(type)}
              className="group flex items-center gap-3 rounded-lg border border-border bg-bg-elevated/40 px-3 py-2.5 text-left hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <span className="grid place-items-center w-8 h-8 rounded-md bg-bg-base text-accent font-mono text-sm shrink-0 group-hover:bg-accent group-hover:text-bg-base transition-colors">
                {meta.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-text-primary">
                  {meta.label}
                </span>
                <span className="block text-xs text-text-muted truncate">
                  {meta.description}
                </span>
              </span>
              <span className="text-text-muted text-xs">+</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
