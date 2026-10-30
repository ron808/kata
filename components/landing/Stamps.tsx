"use client";

import { useState } from "react";
import type { ReactionKind } from "@/lib/types";
import { REACTIONS } from "./content";
import s from "./landing.module.css";

/** The four stamps under a moment. Local only: pressing one stamps it onto the card. */
export function Stamps({ label }: { label: string }) {
  const [given, setGiven] = useState<ReactionKind[]>([]);
  const last = REACTIONS.find((r) => r.kind === given.at(-1));

  return (
    <>
      <div role="group" aria-label={label} className="scale mt-4">
        {REACTIONS.map((r) => {
          const on = given.includes(r.kind);
          return (
            <button
              key={r.kind}
              type="button"
              className="scale-step scale-row min-h-11 text-[0.875rem]"
              aria-pressed={on}
              onClick={() => setGiven((g) => (on ? g.filter((k) => k !== r.kind) : [...g, r.kind]))}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      {last ? (
        <span
          key={last.kind}
          aria-hidden
          className={`${s.restamp} pointer-events-none absolute -right-2 -top-4 grid size-[4.25rem] -rotate-[12deg] place-items-center rounded-full border-2 border-edge bg-sun text-center font-display text-[1.05rem] leading-none text-on-sun shadow-sticker-sm`}
        >
          {last.label}
        </span>
      ) : null}
    </>
  );
}
