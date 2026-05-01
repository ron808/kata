"use client";

import { useEffect, useRef } from "react";
import type { TemplateField } from "@/lib/types";

export function LongTextField({
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
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // auto-expand
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      placeholder={(field.config?.placeholder as string | undefined) ?? "Write something…"}
      value={value ?? ""}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full resize-none overflow-hidden bg-transparent border-b-2 border-border-strong px-0 py-3 text-[20px] leading-[1.7] font-sans font-normal tracking-[-0.005em] text-text-primary placeholder:text-text-muted placeholder:font-normal entry-caret transition-colors focus:border-accent"
    />
  );
}
