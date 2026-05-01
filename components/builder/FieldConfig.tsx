"use client";

import type { TemplateField } from "@/lib/types";

export function FieldConfig({
  field,
  onChange,
}: {
  field: TemplateField;
  onChange: (next: TemplateField) => void;
}) {
  function setLabel(label: string) {
    onChange({ ...field, label });
  }
  function setRequired(required: boolean) {
    onChange({ ...field, required });
  }
  function setConfig(patch: Record<string, unknown>) {
    onChange({ ...field, config: { ...field.config, ...patch } });
  }

  if (field.type === "divider") {
    return (
      <div className="space-y-3">
        <Field label="Section label">
          <input
            value={(field.config.sectionLabel as string) ?? ""}
            onChange={(e) => setConfig({ sectionLabel: e.target.value })}
            placeholder="Optional"
            className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Label">
        <input
          value={field.label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
        />
      </Field>

      {(field.type === "short_text" || field.type === "long_text" || field.type === "link") && (
        <Field label="Placeholder">
          <input
            value={(field.config.placeholder as string) ?? ""}
            onChange={(e) => setConfig({ placeholder: e.target.value })}
            className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
          />
        </Field>
      )}

      {field.type === "number" && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Unit">
            <input
              value={(field.config.unit as string) ?? ""}
              onChange={(e) => setConfig({ unit: e.target.value })}
              className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
            />
          </Field>
          <Field label="Min">
            <input
              type="number"
              value={(field.config.min as number) ?? ""}
              onChange={(e) =>
                setConfig({ min: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
            />
          </Field>
          <Field label="Max">
            <input
              type="number"
              value={(field.config.max as number) ?? ""}
              onChange={(e) =>
                setConfig({ max: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
            />
          </Field>
        </div>
      )}

      {field.type === "yes_no" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Yes label">
            <input
              value={(field.config.yesLabel as string) ?? "Yes"}
              onChange={(e) => setConfig({ yesLabel: e.target.value })}
              className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
            />
          </Field>
          <Field label="No label">
            <input
              value={(field.config.noLabel as string) ?? "No"}
              onChange={(e) => setConfig({ noLabel: e.target.value })}
              className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
            />
          </Field>
        </div>
      )}

      {field.type === "mood_slider" && (
        <Field label="Emojis (5 levels, comma-separated)">
          <input
            value={
              ((field.config.emojis as string[]) ?? ["😞", "😕", "😐", "🙂", "😄"]).join(",")
            }
            onChange={(e) =>
              setConfig({
                emojis: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .slice(0, 5),
              })
            }
            className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm focus:border-accent"
          />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => setRequired(e.target.checked)}
          className="accent-accent"
        />
        Required field
      </label>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs uppercase tracking-wider text-text-muted font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}
