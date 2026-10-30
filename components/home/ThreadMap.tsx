"use client";

import type { CSSProperties } from "react";
import type { ThreadT } from "@/lib/types";
import { STATUS_LABEL } from "@/components/shared/Status";
import { threadMeta } from "./meta";

// Where the stickers sit for each count, in percent of the map, most important first.
const LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 24]],
  2: [[27, 31], [73, 29]],
  3: [[25, 31], [75, 29], [50, 83]],
  4: [[25, 31], [75, 29], [80, 73], [21, 72]],
  5: [[25, 31], [75, 29], [82, 71], [50, 86], [18, 72]],
  6: [[25, 31], [75, 29], [82, 71], [50, 86], [18, 72], [50, 12]],
};
const TILTS = [-6, 5, -4, 3, 7, -3];

function weightOf(i: number, count: number) {
  if (i < 2 || count <= 2) return 3;
  return i < 5 ? 2 : 1;
}

/** Up to six threads as stickers around you. Pass them in priority order. */
export function ThreadMap({
  threads,
  selected,
  onSelect,
  today,
  tz,
}: {
  threads: ThreadT[];
  selected: string | null;
  onSelect: (id: string) => void;
  today: string;
  tz: string;
}) {
  const shown = threads.slice(0, 6);
  const slots = LAYOUTS[shown.length] ?? [];
  return (
    <div className="map" role="group" aria-label="On your mind">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {shown.map((t, i) => (
          <line key={t._id} x1="50" y1="50" x2={slots[i][0]} y2={slots[i][1]} className="map-link" />
        ))}
        {shown.length === 0 ? <circle cx="50" cy="50" r="30" className="map-link" /> : null}
      </svg>
      <span className="map-me" aria-hidden>
        You
      </span>
      {shown.map((t, i) => {
        const weight = weightOf(i, shown.length);
        return (
          <button
            key={t._id}
            type="button"
            className="map-node"
            data-hue={t.hue % 8}
            data-weight={weight}
            aria-pressed={selected === t._id}
            onClick={() => onSelect(t._id)}
            style={{ "--x": `${slots[i][0]}%`, "--y": `${slots[i][1]}%`, "--tilt": `${TILTS[i]}deg` } as CSSProperties}
          >
            <span className="map-title">{t.title}</span>
            {weight > 1 ? <span className="map-meta">{threadMeta(t, today, tz)}</span> : null}
            <span className="sr-only">, {STATUS_LABEL[t.status]}</span>
          </button>
        );
      })}
    </div>
  );
}
