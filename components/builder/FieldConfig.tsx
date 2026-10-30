"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";

/** Id of a field's question input, so the builder can focus it (after adding, or on an error). */
export const questionInputId = (field: Pick<TemplateField, "id">) => `question-${field.id}`;

export function FieldConfig({
  field,
  onChange,
  error,
}: {
  field: TemplateField;
  onChange: (next: TemplateField) => void;
  error?: string;
}) {
  function setConfig(patch: Record<string, unknown>) {
    onChange({ ...field, config: { ...(field.config ?? {}), ...patch } });
  }

  if (field.type === "divider") {
    return (
      <Setting label="Section label" id={questionInputId(field)} hint="Optional. Shown between the questions above and below.">
        {(id, describedBy) => (
          <input
            id={id}
            aria-describedby={describedBy}
            value={(field.config?.sectionLabel as string) ?? ""}
            onChange={(e) => setConfig({ sectionLabel: e.target.value })}
            placeholder="Evening"
            maxLength={60}
            className="control"
          />
        )}
      </Setting>
    );
  }

  return (
    <div className="space-y-4">
      <Setting label="Question" id={questionInputId(field)} error={error}>
        {(id, describedBy) => (
          <input
            id={id}
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
            maxLength={120}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            placeholder="What do you want to ask yourself?"
            className="control text-[1.0625rem] font-semibold"
          />
        )}
      </Setting>

      {(field.type === "short_text" || field.type === "long_text" || field.type === "link") && (
        <Setting label="Placeholder" hint="Faint text in the empty answer.">
          {(id, describedBy) => (
            <input
              id={id}
              aria-describedby={describedBy}
              value={(field.config?.placeholder as string) ?? ""}
              onChange={(e) => setConfig({ placeholder: e.target.value })}
              maxLength={120}
              className="control"
            />
          )}
        </Setting>
      )}

      {field.type === "number" && (
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-3">
          <Setting label="Unit">
            {(id) => (
              <input
                id={id}
                value={(field.config?.unit as string) ?? ""}
                onChange={(e) => setConfig({ unit: e.target.value })}
                placeholder="hours"
                maxLength={20}
                className="control"
              />
            )}
          </Setting>
          <Setting label="Lowest">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                value={(field.config?.min as number) ?? ""}
                onChange={(e) => setConfig({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
                className="control tabular-nums"
              />
            )}
          </Setting>
          <Setting label="Highest">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                value={(field.config?.max as number) ?? ""}
                onChange={(e) => setConfig({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
                className="control tabular-nums"
              />
            )}
          </Setting>
        </div>
      )}

      {field.type === "yes_no" && (
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          <Setting label="Yes label">
            {(id) => (
              <input
                id={id}
                value={(field.config?.yesLabel as string) ?? "Yes"}
                onChange={(e) => setConfig({ yesLabel: e.target.value })}
                maxLength={20}
                className="control"
              />
            )}
          </Setting>
          <Setting label="No label">
            {(id) => (
              <input
                id={id}
                value={(field.config?.noLabel as string) ?? "No"}
                onChange={(e) => setConfig({ noLabel: e.target.value })}
                maxLength={20}
                className="control"
              />
            )}
          </Setting>
        </div>
      )}

      {field.type === "mood_slider" && (
        <Setting label="Five faces, separated by commas" hint="Your own scale, lowest first.">
          {(id, describedBy) => (
            <input
              id={id}
              aria-describedby={describedBy}
              value={((field.config?.emojis as string[]) ?? ["😞", "😕", "😐", "🙂", "😄"]).join(",")}
              onChange={(e) =>
                setConfig({
                  emojis: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .slice(0, 5),
                })
              }
              className="control"
            />
          )}
        </Setting>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={field.required}
        onClick={() => onChange({ ...field, required: !field.required })}
        className="chip"
      >
        <span
          aria-hidden
          className={`grid h-5 w-5 place-items-center rounded-full border-2 border-current transition-colors duration-300 ${
            field.required ? "bg-on-sun text-sun" : ""
          }`}
        >
          {field.required ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        Required
        <span className="font-normal text-current/75 max-xs:sr-only">· marked with a dot</span>
      </button>
    </div>
  );
}

function Setting({
  label,
  id: fixedId,
  hint,
  error,
  children,
}: {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const autoId = useId();
  const id = fixedId ?? autoId;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
