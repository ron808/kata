"use client";

import { Icon } from "@/components/shared/Icon";
import type { FieldType } from "@/lib/types";
import { FIELD_TYPE_META, PALETTE_ORDER } from "./fieldTypes";

/** The ten kinds of field as colourful chips. Wraps on wide screens, a swipe strip on phones. */
export function FieldPalette({
  onAdd,
  full,
}: {
  onAdd: (type: FieldType) => void;
  /** The page is at its limit: chips stay visible but can't add. */
  full: boolean;
}) {
  return (
    <ul
      aria-label="Kinds of question"
      className="no-scrollbar -mx-margin flex snap-x gap-2.5 overflow-x-auto scroll-px-margin px-margin pb-2 pt-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {PALETTE_ORDER.map((type) => {
        const meta = FIELD_TYPE_META[type];
        return (
          <li key={type} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onAdd(type)}
              disabled={full}
              aria-label={`Add ${meta.label.toLowerCase()}: ${meta.description.toLowerCase()}`}
              data-hue={meta.hue ?? undefined}
              className={`chip pl-1.5 pr-3.5 ${meta.hue === null ? "" : "bg-tint text-deep"}`}
            >
              <span
                aria-hidden
                className={`grid h-8 w-8 place-items-center rounded-full border-2 border-edge ${
                  meta.hue === null ? "bg-raised text-ink" : "bg-hue text-on-hue"
                }`}
              >
                <Icon name={meta.icon} className="h-4 w-4" strokeWidth={2} />
              </span>
              {meta.label}
              <Icon name="plus" className="h-4 w-4 opacity-70" strokeWidth={2.2} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
