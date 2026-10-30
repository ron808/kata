"use client";

import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";
import { radioKeys, tabStop } from "./radio";

const VALUES = [true, false] as const;

export function YesNoField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: boolean | null;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  const yesLabel = (field.config?.yesLabel as string) || "Yes";
  const noLabel = (field.config?.noLabel as string) || "No";

  if (readOnly) {
    if (value == null) return <p className="text-[0.9375rem] text-ink/65">Not answered</p>;
    return (
      <p className="inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-edge bg-sun px-4 font-semibold text-on-sun">
        {value ? <Icon name="check" className="h-4 w-4" strokeWidth={2.4} /> : <Icon name="close" className="h-4 w-4" strokeWidth={2.4} />}
        {value ? yesLabel : noLabel}
      </p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={field.label}
      onKeyDown={radioKeys(VALUES, value, onChange)}
      className="flex flex-wrap gap-3"
    >
      {VALUES.map((v, i) => {
        const on = value === v;
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={tabStop(on, i, value != null)}
            onClick={() => onChange(v)}
            className="chip min-w-24"
          >
            {on ? <Icon name="check" className="h-4 w-4" strokeWidth={2.4} /> : null}
            {v ? yesLabel : noLabel}
          </button>
        );
      })}
    </div>
  );
}
