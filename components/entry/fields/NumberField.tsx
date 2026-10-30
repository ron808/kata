"use client";

import type { TemplateField } from "@/lib/types";

export function NumberField({
  field,
  value,
  onChange,
  readOnly,
  id,
}: {
  field: TemplateField;
  value: number | null;
  onChange: (v: number | null) => void;
  readOnly?: boolean;
  id?: string;
}) {
  const unit = field.config?.unit as string | undefined;
  const min = field.config?.min as number | undefined;
  const max = field.config?.max as number | undefined;

  if (readOnly) {
    if (value == null) return <p className="text-[0.9375rem] text-ink/65">Not set</p>;
    return (
      <p className="flex items-baseline gap-2">
        <span className="font-display text-display-m tabular-nums">{value.toLocaleString("en-US")}</span>
        {unit ? <span className="text-[1.0625rem] font-semibold text-ink/70">{unit}</span> : null}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        id={id}
        inputMode="decimal"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        placeholder="0"
        className="control !w-36 font-display text-[1.6rem] tabular-nums"
      />
      {unit ? <span className="text-[1.0625rem] font-semibold text-ink/70">{unit}</span> : null}
    </div>
  );
}
