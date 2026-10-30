"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { Icon } from "@/components/shared/Icon";
import { countWords } from "@/lib/utils/streaks";
import type { TemplateField } from "@/lib/types";
import { LongTextField } from "./fields/LongTextField";
import type { Ask } from "./asks";

function Chevron({ open }: { open: boolean }) {
  return (
    <Icon
      name="chevron"
      strokeWidth={2}
      className={`mt-0.5 h-6 w-6 text-ink/65 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
    />
  );
}

// The same three tilts as the questions on home: taped up by hand.
const TILT = ["-rotate-[1.4deg]", "rotate-[1deg]", "-rotate-[0.5deg]"];

/** DOM id stem for a question card: the card is `${stem}`, its answer `${stem}-a`. */
export const askDomId = (fieldId: string) => `ask-${fieldId.replace(/[^a-z0-9-]/gi, "-")}`;

/**
 * One of Kata's questions, taped to the page. It opens into a writing field and lies flat while
 * open. Uncontrolled by default; pass `open` and `onOpenChange` to drive it from outside.
 */
export function AskCard({
  ask,
  index,
  value,
  onChange,
  open: openProp,
  onOpenChange,
}: {
  ask: Ask;
  index: number;
  value: string;
  onChange: (v: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(() => value.trim().length > 0);
  const open = openProp ?? openState;
  const base = askDomId(ask.fieldId);
  const words = countWords(value);
  const field: TemplateField = {
    id: ask.fieldId,
    type: "long_text",
    label: ask.text,
    required: false,
    order: 0,
    config: { placeholder: "A few lines is plenty" },
  };

  function toggle() {
    const next = !open;
    // Commit now so the field exists, then hand it the caret.
    flushSync(() => {
      setOpenState(next);
      onOpenChange?.(next);
    });
    if (next) document.getElementById(`${base}-a`)?.focus();
  }

  return (
    <li
      id={base}
      data-hue={ask.hue}
      className={`appear relative rounded-lg border-2 border-edge bg-tint transition-[rotate,box-shadow] duration-500 ease-out [animation-delay:var(--delay)] motion-reduce:[animation-delay:0ms] has-[textarea:focus-visible]:shadow-[5px_5px_0_var(--accent)] ${
        open ? "" : TILT[index % TILT.length]
      }`}
      style={{ ["--delay" as string]: `${120 + index * 70}ms` }}
    >
      <span className="tape" aria-hidden />
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${base}-panel`}
          onClick={toggle}
          className="group flex w-full items-start gap-4 rounded-[22px] px-5 pb-5 pt-7 text-left sm:px-7"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="tag max-w-full"><span className="truncate">#{ask.tag}</span></span>
              {ask.thread ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-semibold text-deep">
                  <Icon name="threads" className="h-4 w-4" />
                  <span className="truncate">{ask.thread}</span>
                </span>
              ) : null}
            </span>
            <span id={`${base}-q`} className="mt-3 block font-display text-prompt text-ink">
              {ask.text}
            </span>
            {open ? null : words > 0 ? (
              <span className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-deep">
                <Icon name="check" className="h-4 w-4" strokeWidth={2.2} />
                Answered · {words} {words === 1 ? "word" : "words"}
              </span>
            ) : (
              <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border-2 border-edge bg-surface px-4 text-[0.9375rem] font-semibold text-ink shadow-sticker-sm transition-transform duration-300 ease-out group-hover:-translate-y-px">
                <Icon name="pen" className="h-4 w-4" />
                Answer
              </span>
            )}
          </span>
          <Chevron open={open} />
        </button>
      </h3>
      <div id={`${base}-panel`} hidden={!open} className="px-5 pb-6 sm:px-7">
        {open ? (
          <LongTextField id={`${base}-a`} labelledBy={`${base}-q`} field={field} value={value} onChange={onChange} />
        ) : null}
      </div>
    </li>
  );
}
