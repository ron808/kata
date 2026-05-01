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
  const max = (field.config?.maxLength as number | undefined) ?? 200;
  return (
    <input
      type="text"
      placeholder={(field.config?.placeholder as string | undefined) ?? "Type here…"}
      value={value ?? ""}
      maxLength={max}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-b-2 border-border-strong px-0 py-2.5 text-[18px] font-sans font-normal tracking-[-0.005em] text-text-primary placeholder:text-text-muted entry-caret transition-colors focus:border-accent"
    />
  );
}
