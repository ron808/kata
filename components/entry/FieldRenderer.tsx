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
  switch (field.type) {
    case "short_text":
      return (
        <ShortTextField
          field={field}
          value={(value as string) ?? ""}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "long_text":
      return (
        <LongTextField
          field={field}
          value={(value as string) ?? ""}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "mood_slider":
      return (
        <MoodSlider
          field={field}
          value={(value as number | null) ?? null}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "energy":
      return (
        <EnergyLevel
          field={field}
          value={(value as number | null) ?? null}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "number":
      return (
        <NumberField
          field={field}
          value={(value as number | null) ?? null}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "tags":
      return (
        <TagField
          field={field}
          value={(value as string[]) ?? []}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "yes_no":
      return (
        <YesNoField
          field={field}
          value={(value as boolean | null) ?? null}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "rating":
      return (
        <RatingField
          value={(value as number | null) ?? null}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "link":
      return (
        <LinkField
          field={field}
          value={(value as string) ?? ""}
          onChange={handleChange}
          readOnly={readOnly}
        />
      );
    case "divider":
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          {field.config?.sectionLabel ? (
            <span className="text-xs uppercase tracking-widest text-text-muted font-mono">
              {field.config.sectionLabel as string}
            </span>
          ) : null}
          <div className="flex-1 h-px bg-border" />
        </div>
      );
  }
}
