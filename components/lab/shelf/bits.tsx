"use client";

import type { ReactNode } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";
import type { Book, Leaf } from "./data";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** A labelled on/off switch with a 44px hit area. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex min-h-11 w-full items-start justify-between gap-4 rounded-md py-2 text-left"
    >
      <span>
        <span className="block text-[0.9375rem] font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-ink/65">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={`relative mt-0.5 inline-flex h-[1.625rem] w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${ checked ? "bg-ink" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute left-[3px] h-5 w-5 rounded-full bg-ground shadow-paper transition-transform duration-300 ease-out ${ checked ? "translate-x-[1.125rem]" : ""
          }`}
        />
      </span>
    </button>
  );
}

/** A checkbox whose whole row is the hit area; the box itself is drawn. */
export function CheckRow({
  checked,
  onChange,
  children,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  id: string;
}) {
  return (
    <label htmlFor={id} className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-md">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border-[1.5px] transition-colors duration-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${ checked ? "border-ink bg-ink text-ground" : "border-ink/35"
        }`}
      >
        {checked ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 text-[0.9375rem] text-ink/80">{children}</span>
    </label>
  );
}

/** A small byline: their seal, pen name and book. */
export function Byline({ book, date, size = 32 }: { book: Book; date?: string; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <PersonSeal initial={book.initial} size={size} state={book.resting ? "resting" : "inked"} />
      <p className="min-w-0 text-sm leading-snug text-ink/65">
        <span className="block font-medium text-ink">{book.pen}</span>
        <span className="">{book.title}</span>
        {date ? <span> · {date}</span> : null}
      </p>
    </div>
  );
}

/** One leaf as it reads on the page. */
export function LeafText({ leaf, size = "md" }: { leaf: Leaf; size?: "md" | "lg" }) {
  return (
    <>
      <h3 className={`font-display leading-[1.05] ${size === "lg" ? "text-[clamp(1.6rem,1.3rem+1vw,2.1rem)]" : "text-[1.55rem]"}`}>{leaf.title}</h3>
      <p className="mt-2 max-w-[38rem] text-prose text-ink/85">{leaf.body}</p>
    </>
  );
}

/** A tiny book spine drawn inline, used where the full shelf isn't on screen. */
export function MiniSpine({ book, className = "" }: { book: Book; className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative flex h-40 w-11 shrink-0 flex-col items-center justify-between rounded-[3px] pb-2.5 pt-3 text-ink ${toneClass(book.tone)} ${className}`}
    >
      <span className="pointer-events-none absolute inset-x-[18%] top-1.5 h-px bg-current opacity-25" />
      <span className="pointer-events-none absolute inset-x-[18%] bottom-1 h-px bg-current opacity-25" />
      <span className="min-h-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-display text-[0.9375rem] leading-none text-ink/85 [writing-mode:vertical-rl] [text-orientation:sideways]">
        {book.title}
      </span>
      <PersonSeal initial={book.initial} size={20} className="mt-1.5" />
    </span>
  );
}

export function toneClass(tone: Book["tone"]) {
  switch (tone) {
    case "paper":
      return "sheet";
    case "raised":
      return "bg-[color-mix(in_oklab,var(--ink)_7%,var(--raised))] shadow-paper";
    case "night":
      return "chapter shadow-paper";
    case "ink":
      return "bg-[color-mix(in_oklab,var(--ink)_22%,var(--surface))] shadow-paper";
  }
}

export { showLabScreen as goToScreen } from "@/components/lab/LabFrame";
