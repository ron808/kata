"use client";

import type { TemplateField } from "@/lib/types";

export function ShortTextField({
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
  const max = (field.config.maxLength as number | undefined) ?? 200;
  return (
    <input
      type="text"
      placeholder={field.config.placeholder ?? "Type here…"}
      value={value ?? ""}
      maxLength={max}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-b border-border-strong px-0 py-2.5 text-[17px] font-serif text-text-primary placeholder:text-text-muted placeholder:italic entry-caret transition-colors focus:border-accent"
    />
  );
}
