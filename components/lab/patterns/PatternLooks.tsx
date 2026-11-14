"use client";

import { useMemo, useState } from "react";
import { PatternRows, PatternsCard } from "@/components/breakdowns/Patterns";
import { useCompanion } from "@/components/shared/Companion";
import { PatternCalendar } from "./PatternCalendar";
import { PatternCards } from "./PatternCards";
import { demoPatterns } from "./demo";

/*
 * Three ways to show patterns, on the same made-up days and the same arithmetic as the app. Rows
 * is what Breakdowns shows now; pick one and the other two go.
 */

const LOOKS = [
  { id: "rows", name: "Rows", says: "Everything that stands out at once, each with its scale: the quickest read." },
  { id: "cards", name: "One at a time", says: "Each pattern on its own with its numbers stuck on big; Back and Next go through them." },
  { id: "calendar", name: "Calendar", says: "The days themselves: pick something and see which days it was, with the mood of each as a bar." },
] as const;
type Look = (typeof LOOKS)[number]["id"];

export function PatternLooks({ today }: { today: string }) {
  const { name } = useCompanion();
  const [look, setLook] = useState<Look>("rows");
  const [fresh, setFresh] = useState(false);
  const p = useMemo(() => demoPatterns(today, fresh), [today, fresh]);
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Look" className="flex flex-wrap gap-2">
          {LOOKS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={look === l.id} className="chip" onClick={() => setLook(l.id)}>
              {l.name}
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={fresh} className="chip" onClick={() => setFresh((f) => !f)}>
          A new account
        </button>
      </div>
      <p className="text-[0.9375rem] text-ink/75">{LOOKS.find((l) => l.id === look)!.says}</p>
      <div className="max-w-[52rem]">
        <PatternsCard p={p} name={name}>
          {look === "rows" ? <PatternRows p={p} name={name} /> : look === "cards" ? <PatternCards p={p} name={name} /> : <PatternCalendar p={p} name={name} />}
        </PatternsCard>
      </div>
      <p className="text-[0.875rem] text-ink/70">Example days, made up: a walk lifts the mood, sleep the energy, and water does nothing. Nothing here is saved.</p>
    </div>
  );
}
