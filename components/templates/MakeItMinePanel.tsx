"use client";

import { QuestionChip } from "@/components/builder/QuestionChip";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { FormAlert, TextField } from "@/components/shared/TextField";
import type { MakeItMine } from "./useMakeItMine";

/** Rename the page and keep or drop each question. */
export function MakeItMinePanel({ mine, idPrefix }: { mine: MakeItMine; idPrefix: string }) {
  const { name } = useCompanion();
  const total = mine.questions.length;
  return (
    <div>
      <TextField
        id={`${idPrefix}-name`}
        label="Name"
        value={mine.name}
        onChange={(e) => mine.setName(e.target.value)}
        maxLength={80}
        autoComplete="off"
        error={mine.nameError ?? undefined}
      />
      <fieldset className="mt-6">
        <legend className="text-[0.9375rem] font-semibold">
          Questions{" "}
          <span className="font-normal tabular-nums text-ink/65">
            · {mine.keptCount} of {total} kept
          </span>
        </legend>
        <p className="mt-1 text-sm text-ink/65">Tap a question to drop it, and again to keep it.</p>
        <ul className="mt-4 flex flex-wrap gap-2.5">
          {mine.questions.map((f, i) => (
            <li key={f.id} className="max-w-full">
              <QuestionChip field={f} checked={!mine.dropped.has(f.id)} onToggle={() => mine.toggle(f.id)} index={i} />
            </li>
          ))}
        </ul>
      </fieldset>
      <p className="mt-6 text-sm text-ink/65">Each day {name} adds up to three questions of its own, from what’s on your mind.</p>
    </div>
  );
}

/** Use this page (primary) and Remix in the builder, with what's in the way said plainly. */
export function MakeItMineActions({ mine, idPrefix, className = "" }: { mine: MakeItMine; idPrefix: string; className?: string }) {
  const off = Boolean(mine.blocked) || Boolean(mine.busy);
  const blockedId = `${idPrefix}-blocked`;
  return (
    <div className={className}>
      {mine.error ? (
        <div className="mb-3">
          <FormAlert>{mine.error}</FormAlert>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <Button onClick={() => mine.adopt("write")} disabled={off} aria-describedby={mine.blocked ? blockedId : undefined}>
          {mine.busy === "write" ? "Saving…" : "Use this page"}
        </Button>
        <Button variant="secondary" onClick={() => mine.adopt("builder")} disabled={off}>
          {mine.busy === "builder" ? "Opening…" : "Remix in the builder"}
        </Button>
        {mine.blocked ? (
          <p id={blockedId} className="text-sm font-medium text-bad">
            {mine.blocked}
          </p>
        ) : null}
      </div>
    </div>
  );
}
