"use client";

import { useEffect, useRef } from "react";
import type { TemplateField } from "@/lib/types";

/** Written text as paragraphs: blank lines split them, single line breaks stay. */
export function Prose({ text, className = "" }: { text: string; className?: string }) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={`max-w-[40rem] space-y-4 text-prose text-ink ${className}`}>
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

export function LongTextField({
  field,
  value,
  onChange,
  readOnly,
  id,
  labelledBy,
  rows = 3,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  id?: string;
  /** For writing fields named by something other than a <label>, like a question card. */
  labelledBy?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const placeholder = (field.config?.placeholder as string | undefined) ?? "Write something";

  // Grow with the writing so the page, not the box, scrolls.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  if (readOnly) {
    return value?.trim() ? <Prose text={value} /> : <p className="text-[0.9375rem] text-ink/65">Left blank</p>;
  }

  return (
    <textarea
      ref={ref}
      id={id}
      aria-labelledby={labelledBy}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="writing ruled block"
      style={{ minHeight: `calc(var(--rule) * ${rows})` }}
    />
  );
}
