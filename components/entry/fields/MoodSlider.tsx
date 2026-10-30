"use client";

import type { TemplateField } from "@/lib/types";
import { MOOD_LABELS, MoodDots } from "./meters";
import { radioKeys, tabStop } from "./radio";

const STEPS = [1, 2, 3, 4, 5] as const;
// Older templates stored this emoji set as the default; it reads as the plain scale now.
const DEFAULT_EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];

/** A writer's own five glyphs, if they chose some; otherwise null and the scale uses words. */
function customGlyphs(config: TemplateField["config"] | undefined): string[] | null {
  const glyphs = config?.emojis;
  if (!Array.isArray(glyphs) || glyphs.length !== 5) return null;
  if (glyphs.every((g, i) => g === DEFAULT_EMOJIS[i])) return null;
  return glyphs.map(String);
}

export function MoodSlider({
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
  const glyphs = customGlyphs(field.config);

  if (readOnly) {
    if (!value) return <p className="text-[0.9375rem] text-ink/65">Not set</p>;
    return (
      <p className="inline-flex items-center gap-3">
        {glyphs ? (
          <span aria-hidden className="text-[1.6rem] leading-none">
            {glyphs[value - 1]}
          </span>
        ) : (
          <MoodDots value={value} size={7} />
        )}
        <span className="font-display text-display-s">{glyphs ? `${value} of 5` : MOOD_LABELS[value - 1]}</span>
        <span className="sr-only">, mood {value} of 5</span>
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
          aria-label={glyphs ? `Mood ${n} of 5` : undefined}
          tabIndex={tabStop(value === n, i, value != null)}
          onClick={() => onChange(n)}
          className="scale-step focus-visible:-outline-offset-4"
        >
          {glyphs ? (
            <span aria-hidden className="text-[1.35rem] leading-none">
              {glyphs[i]}
            </span>
          ) : (
            <MoodDots value={n} />
          )}
          {glyphs ? null : MOOD_LABELS[i]}
        </button>
      ))}
    </div>
  );
}
