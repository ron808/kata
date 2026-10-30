"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { interestLabel, MAX_INTERESTS, normalizeInterest } from "@/components/onboarding/script";

/**
 * What Kata should ask about: toggle chips for the question bank's topics, plus your own.
 * Your own come first so they never hide among the suggestions.
 */
export function InterestPicker({
  id,
  options,
  value,
  onChange,
  labelledBy,
}: {
  id: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Id of the question or heading this group answers. */
  labelledBy: string;
}) {
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const full = value.length >= MAX_INTERESTS;
  const chips = [...value.filter((v) => !options.includes(v)), ...options];

  function toggle(tag: string) {
    setNote(null);
    if (value.includes(tag)) onChange(value.filter((t) => t !== tag));
    else if (!full) onChange([...value, tag]);
  }

  function add() {
    const tag = normalizeInterest(draft);
    if (!tag) return;
    if (value.includes(tag)) setNote(`${interestLabel(tag)} is already on.`);
    else if (full) setNote(`That’s ${MAX_INTERESTS}. Turn one off to add another.`);
    else {
      onChange([...value, tag]);
      setNote(null);
    }
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div>
      <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
        {chips.map((tag) => {
          const on = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              className="chip"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(tag)}
            >
              <Icon name={on ? "check" : "plus"} className="h-4 w-4" strokeWidth={on ? 2.4 : 2} />
              {interestLabel(tag)}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <label htmlFor={`${id}-own`} className="sr-only">
          Add your own topic
        </label>
        <input
          id={`${id}-own`}
          className="control min-w-0 flex-1"
          placeholder="Add your own"
          value={draft}
          maxLength={32}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          autoComplete="off"
        />
        <Button variant="secondary" size="lg" className="shrink-0" onClick={add} disabled={full || !draft.trim()}>
          Add
        </Button>
      </div>
      <p aria-live="polite" className="mt-2.5 text-sm text-ink/65">
        {note ?? `${value.length} of ${MAX_INTERESTS} picked.`}
      </p>
    </div>
  );
}
