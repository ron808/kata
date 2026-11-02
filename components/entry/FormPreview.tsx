"use client";

import { useState } from "react";
import type { FieldValue, TemplateField } from "@/lib/types";
import { FieldPrompt } from "./FieldPrompt";
import { FieldRenderer, fieldInputId, isLabelable } from "./FieldRenderer";

/**
 * A daily form you can try: real field controls, local state, nothing saved.
 * Flat on purpose: it sits inside the caller's card, so it never draws cards of its own.
 */
export function FormPreview({ fields }: { fields: TemplateField[] }) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  return (
    <div className="space-y-8">
      {fields.map((field) => (
        <div key={field.id} className="space-y-3">
          {field.type !== "divider" ? (
            <FieldPrompt as={isLabelable(field) ? "label" : "p"} htmlFor={fieldInputId(field)}>
              {field.label}
            </FieldPrompt>
          ) : null}
          <FieldRenderer
            field={field}
            value={values[field.id] ?? (field.type === "tags" ? [] : null)}
            onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
          />
        </div>
      ))}
    </div>
  );
}
