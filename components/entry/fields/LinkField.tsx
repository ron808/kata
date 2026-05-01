"use client";

import type { TemplateField } from "@/lib/types";

export function LinkField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const isValid =
    !value || /^https?:\/\/[^\s]+$/i.test(value);
  return (
    <div className="space-y-1.5">
      <input
        type="url"
        placeholder={field.config.placeholder ?? "https://…"}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-bg-elevated/40 border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-muted font-mono text-sm transition-colors focus:border-accent ${
          isValid ? "border-border" : "border-danger/50"
        }`}
      />
      {value && isValid && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
        >
          ↗ Open link
        </a>
      )}
    </div>
  );
}
