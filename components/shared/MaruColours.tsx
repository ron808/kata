"use client";

import { useId } from "react";
import { COMPANION_COLOURS, colourLabel } from "@/lib/companion/name";
import { MaruMark } from "./Avatar";

/** The colours the companion can wear, each shown as its face. Picking one previews it there. */
export function MaruColours({ value, onChange, label = "Colour" }: { value: number | null; onChange: (hue: number | null) => void; label?: string }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id}>
      <p id={id} className="mb-2 text-[0.875rem] font-semibold">
        {label} <span className="font-normal text-ink/65">· {colourLabel(value)}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {COMPANION_COLOURS.map((c) => (
          <button
            key={c.label}
            type="button"
            role="radio"
            aria-checked={value === c.hue}
            aria-label={c.label}
            title={c.label}
            onClick={() => onChange(c.hue)}
            // "0" previews vermilion even inside an app that wears another colour.
            data-maru={c.hue ?? 0}
            className="chip !min-h-0 h-11 w-11 !p-0"
          >
            <MaruMark size={30} />
          </button>
        ))}
      </div>
    </div>
  );
}
