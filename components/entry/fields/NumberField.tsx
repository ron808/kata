"use client";

import type { TemplateField } from "@/lib/types";

export function NumberField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: number | null;
  onChange: (v: number | null) => void;
  readOnly?: boolean;
}) {
  const unit = field.config.unit as string | undefined;
  const min = field.config.min as number | undefined;
  const max = field.config.max as number | undefined;

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        readOnly={readOnly}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        placeholder="0"
        className="w-32 bg-bg-elevated/40 border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-muted font-mono transition-colors focus:border-accent"
      />
      {unit && (
        <span className="text-text-muted text-sm font-mono uppercase tracking-wide">
          {unit}
        </span>
      )}
    </div>
  );
}
