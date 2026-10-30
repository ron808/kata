"use client";

import type { FieldValue, TemplateField } from "@/lib/types";
import { ShortTextField } from "./fields/ShortTextField";
import { LongTextField } from "./fields/LongTextField";
import { MoodSlider } from "./fields/MoodSlider";
import { EnergyLevel } from "./fields/EnergyLevel";
import { NumberField } from "./fields/NumberField";
import { TagField } from "./fields/TagField";
import { YesNoField } from "./fields/YesNoField";
import { RatingField } from "./fields/RatingField";
import { LinkField } from "./fields/LinkField";

/** Id for a field's input, shared with the prompt's `htmlFor`. */
export const fieldInputId = (field: TemplateField) => `field-${field.id}`;

/** A divider: the name of the next part of the page, on a dashed rule. */
export function SectionBreak({ label }: { label?: string }) {
  return (
    <div role="separator" aria-label={label || undefined} className="flex items-center gap-4 py-1">
      {label ? <span className="font-display text-display-s">{label}</span> : null}
      <span aria-hidden className="h-0 flex-1 border-t-2 border-dashed border-edge/35" />
    </div>
  );
}

export function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: FieldValue;
  // Optional so server components rendering in read-only mode don't have to pass a function
  // (event handlers cannot cross the server/client boundary).
  onChange?: (v: FieldValue) => void;
  readOnly?: boolean;
}) {
  const handleChange = onChange ?? (() => {});
  const id = fieldInputId(field);
  switch (field.type) {
    case "short_text":
      return <ShortTextField id={id} field={field} value={(value as string) ?? ""} onChange={handleChange} readOnly={readOnly} />;
    case "long_text":
      return <LongTextField id={id} field={field} value={(value as string) ?? ""} onChange={handleChange} readOnly={readOnly} />;
    case "mood_slider":
      return <MoodSlider field={field} value={(value as number | null) ?? null} onChange={handleChange} readOnly={readOnly} />;
    case "energy":
      return <EnergyLevel field={field} value={(value as number | null) ?? null} onChange={handleChange} readOnly={readOnly} />;
    case "number":
      return <NumberField id={id} field={field} value={(value as number | null) ?? null} onChange={handleChange} readOnly={readOnly} />;
    case "tags":
      return <TagField id={id} field={field} value={(value as string[]) ?? []} onChange={handleChange} readOnly={readOnly} />;
    case "yes_no":
      return <YesNoField field={field} value={(value as boolean | null) ?? null} onChange={handleChange} readOnly={readOnly} />;
    case "rating":
      return <RatingField label={field.label} value={(value as number | null) ?? null} onChange={handleChange} readOnly={readOnly} />;
    case "link":
      return <LinkField id={id} field={field} value={(value as string) ?? ""} onChange={handleChange} readOnly={readOnly} />;
    case "divider":
      return <SectionBreak label={field.config?.sectionLabel as string | undefined} />;
  }
}

/** Which field types take a text input that a <label> can point at. */
export function isLabelable(field: TemplateField) {
  return ["short_text", "long_text", "number", "tags", "link"].includes(field.type);
}
