"use client";

import type { ReactNode } from "react";

const LISTED = {
  on: "Anyone on Kata can find you by name, and you can come up in their suggestions.",
  off: "Only someone who types your whole handle can find you.",
};

/**
 * Whether a profile is listed: in Settings, and on setup's handle step. Both say the same thing.
 * `copy` gives another on/off setting (showing when you're active) the same switch.
 */
export function PublicSwitch({
  id,
  label,
  on,
  onChange,
  error,
  copy = LISTED,
  disabled = false,
  className = "",
  children,
}: {
  id: string;
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  error?: string;
  copy?: { on: string; off: string };
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`well p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p id={`${id}-label`} className="font-semibold">
            {label}
          </p>
          <p id={`${id}-desc`} className="mt-1 text-sm text-ink/75">
            {on ? copy.on : copy.off}
          </p>
        </div>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-desc${error ? ` ${id}-err` : ""}`}
          disabled={disabled}
          onClick={() => onChange(!on)}
          className="group grid h-11 w-16 shrink-0 place-items-center rounded-full"
        >
          <span
            aria-hidden
            className={`relative h-8 w-14 rounded-full border-2 border-edge shadow-sticker-sm transition-colors duration-300 ${
              on ? "bg-sun" : "bg-surface"
            }`}
          >
            <span
              className={`absolute left-[3px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-edge bg-ink transition-transform duration-300 ease-out ${
                on ? "translate-x-6" : ""
              }`}
            />
          </span>
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-3 text-sm font-medium text-bad">
          {error}
        </p>
      ) : null}
      {children}
    </div>
  );
}
