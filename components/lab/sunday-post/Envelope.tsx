"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE, Postmark, Stamp } from "./bits";
import type { Motif } from "./data";

/** Seconds into the opening: the seal splits, the flap swings up, the letter rises out. */
export const OPENING = { flap: 0.35, flapFor: 0.75, rise: 1.05, riseFor: 1.0, done: 2.45 };

/**
 * The back of an envelope: a flap, the sender's seal at its tip, their name, a stamp and a
 * postmark. Sizes inside follow the envelope's width (container units), so the same face
 * works in the fan, the phone pile and the opening stage.
 *
 * Opening: the flap swings up and stays open behind the opening, and `insert` (the letter
 * or postcard inside) rises out of the pocket. The body of the envelope covers the insert,
 * so only the part above the top edge shows. Leave room above the envelope for both.
 */
export function Envelope({
  name,
  meta,
  motif,
  city,
  date,
  seal,
  flapOpen = false,
  stage = false,
  insert,
}: {
  name: string;
  meta: ReactNode;
  motif: Motif;
  city: string;
  date: string;
  seal: ReactNode;
  flapOpen?: boolean;
  stage?: boolean;
  insert?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const t = (s: number) => (reduce ? 0 : s);
  return (
    <div className="@container relative aspect-[8/5] w-full text-left text-ink" style={{ perspective: 1100 }}>
      {insert ? (
        <motion.div
          aria-hidden
          className="sheet absolute inset-x-[7%] top-[5%] z-[5] h-[86%] overflow-hidden"
          // A shade apart from the envelope, so the letter reads as its own paper in both themes.
          style={{ backgroundColor: "color-mix(in oklab, var(--ink) 3.5%, var(--surface))" }}
          initial={false}
          animate={{ y: flapOpen ? "-55%" : "0%" }}
          transition={{ duration: t(OPENING.riseFor), delay: t(OPENING.rise), ease: EASE }}
        >
          {insert}
        </motion.div>
      ) : null}

      {/* The body: the face of the envelope that covers whatever is inside. */}
      <div className="absolute inset-0 z-10 rounded-xs bg-surface shadow-paper" />

      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[54%] origin-top"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={flapOpen ? { rotateX: 178, zIndex: 0 } : { rotateX: 0, zIndex: 20 }}
        transition={{
          rotateX: { duration: t(OPENING.flapFor), delay: t(OPENING.flap), ease: EASE },
          // Behind the letter once it passes upright, so the letter rises in front of it.
          zIndex: { duration: 0, delay: flapOpen ? t(OPENING.flap + OPENING.flapFor * 0.45) : 0 },
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" style={{ backfaceVisibility: "hidden" }}>
          <polygon
            points="0,0 50,100 100,0"
            fill="color-mix(in oklab, var(--ink) 4%, var(--surface))"
            stroke="color-mix(in oklab, var(--ink) 18%, transparent)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
        {/* The inside of the flap, seen once it swings open. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
        >
          <polygon
            points="0,100 50,0 100,100"
            fill="color-mix(in oklab, var(--ink) 9%, var(--surface))"
            stroke="color-mix(in oklab, var(--ink) 18%, transparent)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      <div className="absolute left-1/2 top-[54%] z-30 -translate-x-1/2 -translate-y-1/2">{seal}</div>

      <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 p-[5cqi]">
        <div className="min-w-0">
          <p className="truncate font-display text-[clamp(1.25rem,7cqi,2.25rem)] leading-none">{name}</p>
          <p className="mt-1 truncate text-[clamp(0.8125rem,3.9cqi,1rem)] text-ink/65">{meta}</p>
        </div>
        <div className={`relative shrink-0 ${stage ? "sm:hidden" : ""}`}>
          <Stamp motif={motif} w={40} h={48} />
          <Postmark city={city} date={date} size={44} className="absolute bottom-[38%] right-0" />
        </div>
        {stage ? (
          <div className="relative hidden shrink-0 sm:block">
            <Stamp motif={motif} w={56} h={64} />
            <Postmark city={city} date={date} size={60} className="absolute bottom-[38%] right-0" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
