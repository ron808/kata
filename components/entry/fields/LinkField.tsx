"use client";

import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";

function hostOf(value: string) {
  try {
    return value ? new URL(value).host.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

export function LinkField({
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
  const isValid = !value || /^https?:\/\/[^\s]+$/i.test(value);
  const host = hostOf(value);

  if (readOnly) {
    return value && isValid ? (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="link inline-flex min-h-11 max-w-full items-center gap-1.5 break-all text-[1.0625rem] font-semibold"
      >
        {host || value}
        <Icon name="external" className="h-4 w-4" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    ) : (
      <p className="text-[0.9375rem] text-ink/65">{value || "No link"}</p>
    );
  }

  const hintId = id ? `${id}-hint` : undefined;
  return (
    <div className="space-y-2">
      <input
        type="url"
        id={id}
        inputMode="url"
        autoCapitalize="none"
        placeholder={(field.config?.placeholder as string | undefined) ?? "https://"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!isValid}
        aria-describedby={!isValid ? hintId : undefined}
        className="control"
      />
      {value && isValid ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="link inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-medium text-ink/75"
        >
          Open {host || "link"}
          <Icon name="external" className="h-3.5 w-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : !isValid ? (
        <p id={hintId} className="text-[0.875rem] font-medium text-bad">
          Links start with http:// or https://
        </p>
      ) : null}
    </div>
  );
}
