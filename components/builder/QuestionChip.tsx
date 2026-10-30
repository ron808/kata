"use client";

import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";
import { FIELD_TYPE_META } from "./fieldTypes";

// Stuck-on stickers lean a little; a peeled one lies flat.
const TILTS = [-1.1, 0.8, -0.5, 1.2, -0.9, 0.6, -1.3, 0.9];

/**
 * A question as a sticker you can stick on or peel off. `keep` mode (Make it
 * mine): checked means kept, unchecked is crossed out. `pick` mode (Ask Kata):
 * unchecked is on offer, checked is picked.
 */
export function QuestionChip({
  field,
  checked,
  onToggle,
  index = 0,
  mode = "keep",
  disabled = false,
}: {
  field: Pick<TemplateField, "id" | "type" | "label">;
  checked: boolean;
  onToggle: () => void;
  index?: number;
  mode?: "keep" | "pick";
  disabled?: boolean;
}) {
  const meta = FIELD_TYPE_META[field.type];
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      disabled={disabled}
      data-hue={meta.hue ?? 1}
      style={{ rotate: checked ? `${TILTS[index % TILTS.length]}deg` : "0deg" }}
      className={`group flex min-h-11 max-w-full items-center gap-2.5 rounded-md border-2 py-1.5 pl-1.5 pr-3.5 text-left text-[0.9375rem] font-semibold leading-snug transition-[rotate,box-shadow,background-color,color,border-color,opacity] duration-300 ease-out disabled:opacity-45 ${
        checked
          ? "border-edge bg-tint text-deep shadow-sticker-sm"
          : "border-dashed border-ink/45 bg-transparent text-ink/70 hover:border-edge hover:text-ink"
      }`}
    >
      <span
        aria-hidden
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300 ${
          checked ? "border-edge bg-hue text-on-hue" : "border-ink/45 text-ink/70 group-hover:border-edge"
        }`}
      >
        <Icon name={checked ? "check" : "plus"} className="h-3.5 w-3.5" strokeWidth={2.8} />
      </span>
      <span className={`min-w-0 [overflow-wrap:anywhere] ${!checked && mode === "keep" ? "line-through decoration-2" : ""}`}>
        {field.label}
        <span className="sr-only">, {meta.label.toLowerCase()}</span>
      </span>
    </button>
  );
}
