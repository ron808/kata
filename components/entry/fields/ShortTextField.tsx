"use client";

import type { TemplateField } from "@/lib/types";

export function ShortTextField({
  field,
  value,
  onChange,
  readOnly,
  id,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  id?: string;
}) {
  const max = (field.config?.maxLength as number | undefined) ?? 200;
  const placeholder = (field.config?.placeholder as string | undefined) ?? "A line or two";

  if (readOnly) {
    return value ? (
      <p className="max-w-[40rem] text-prose text-ink">{value}</p>
    ) : (
      <p className="text-[0.9375rem] text-ink/65">Left blank</p>
    );
  }

  // One rule under the line, in a box tall enough to tap.
  return (
    <input
      type="text"
      id={id}
      placeholder={placeholder}
      value={value ?? ""}
      maxLength={max}
      onChange={(e) => onChange(e.target.value)}
      className="writing ruled h-11 bg-bottom bg-no-repeat"
    />
  );
}
