"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE } from "./data";

// Geometry, in a 100 × 62.5 box (8:5). The flap point sits at 52% of the height,
// which is where the seal goes.
const FLAP = "M0 0 L50 32.5 L100 0 Z";
// The front pocket is the whole envelope minus the flap's notch.
const POCKET = "M0 0 L50 32.5 L100 0 L100 62.5 L0 62.5 Z";

/**
 * A paper envelope drawn in layers: the inside, a folded page, the front pocket, the flap.
 * `open` folds the flap back. `drawn` slides the page up out of the pocket.
 * Opened, the flap and page reach up to a quarter of the width above the envelope: leave room.
 */
export function Envelope({
  seal,
  children,
  open = false,
  drawn = false,
  className = "",
}: {
  seal?: ReactNode;
  children?: ReactNode;
  open?: boolean;
  drawn?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative aspect-[8/5] w-full rounded-xs shadow-paper ${className}`}>
      {/* The inside, seen through the notch once the flap is back. */}
      <div aria-hidden className="absolute inset-0 rounded-xs bg-[color-mix(in_oklab,var(--surface)_88%,var(--ink))]" />

      {/* The folded page inside. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-[7%] bottom-[5%] top-[6%] z-[1] rounded-xs bg-[color-mix(in_oklab,var(--surface)_72%,var(--raised))] shadow-[0_-1px_0_color-mix(in_oklab,var(--ink)_8%,transparent)]"
        initial={false}
        animate={{ y: drawn ? "-48%" : "0%" }}
        transition={{ duration: reduce ? 0 : 0.95, ease: EASE }}
      >
        <span className="absolute inset-x-[9%] top-[14%] block space-y-[7%]">
          {[88, 100, 94, 72].map((w, i) => (
            <span key={i} className="block h-px bg-ink/15" style={{ width: `${w}%` }} />
          ))}
        </span>
      </motion.div>

      {/* The front pocket, with its two side folds meeting under the flap. */}
      <svg aria-hidden viewBox="0 0 100 62.5" preserveAspectRatio="none" className="absolute inset-0 z-[2] h-full w-full overflow-visible">
        <path d={POCKET} fill="var(--surface)" />
        <path
          d="M0 62.5 L43 31 M100 62.5 L57 31"
          fill="none"
          stroke="color-mix(in oklab, var(--ink) 10%, transparent)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* The flap: on top while closed, folded back behind the page once open. */}
      <motion.svg
        aria-hidden
        viewBox="0 0 100 32.5"
        preserveAspectRatio="none"
        className={`absolute inset-x-0 top-0 h-[52%] w-full origin-top overflow-visible [filter:drop-shadow(0_1px_1px_color-mix(in_oklab,var(--ink)_9%,transparent))] ${drawn ? "z-0" : "z-[3]"}`}
        initial={false}
        animate={{ scaleY: open ? -0.72 : 1 }}
        transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
      >
        <path d={FLAP} fill="color-mix(in oklab, var(--surface) 96%, var(--ink))" />
        <path
          d="M0 0 L50 32.5 L100 0"
          fill="none"
          stroke="color-mix(in oklab, var(--ink) 18%, transparent)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </motion.svg>

      {children ? <div className="absolute inset-x-0 bottom-0 top-[58%] z-[4] px-[7%] pb-[5%] pt-[5%]">{children}</div> : null}
      {seal ? <div className="absolute left-1/2 top-[52%] z-[5] -translate-x-1/2 -translate-y-1/2">{seal}</div> : null}
    </div>
  );
}

/** A small envelope glyph for the almanac and inline hints. */
export function EnvelopeMark({ className = "h-3.5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 14" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <rect x="1" y="1" width="18" height="12" rx="1.2" />
      <path d="M1.5 1.5 10 8l8.5-6.5" />
    </svg>
  );
}
