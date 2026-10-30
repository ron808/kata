"use client";

import type { TemplateField } from "@/lib/types";
import { ENERGY_LABELS, EnergyBars } from "./meters";
import { radioKeys, tabStop } from "./radio";

const STEPS = [1, 2, 3, 4, 5] as const;

export function EnergyLevel({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: number | null;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    if (!value) return <p className="text-[0.9375rem] text-ink/65">Not set</p>;
    return (
      <p className="inline-flex items-center gap-3">
        <EnergyBars value={value} height={18} className="[&>span]:w-[5px]" />
        <span className="font-display text-display-s">{ENERGY_LABELS[value - 1]}</span>
        <span className="sr-only">, energy {value} of 5</span>
      </p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={field.label}
      onKeyDown={radioKeys(STEPS, value as (typeof STEPS)[number] | null, onChange)}
      className="scale w-full max-w-[30rem]"
    >
      {STEPS.map((n, i) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          tabIndex={tabStop(value === n, i, value != null)}
          onClick={() => onChange(n)}
          className="scale-step focus-visible:-outline-offset-4"
        >
          <EnergyBars value={n} />
          {ENERGY_LABELS[i]}
        </button>
      ))}
    </div>
  );
}
