"use client";

import { useState, type ComponentProps } from "react";
import { Icon } from "@/components/shared/Icon";

/** TextField for passwords, with a button that shows what you typed. */
export function PasswordField({
  id,
  label,
  error,
  hint,
  ...input
}: Omit<ComponentProps<"input">, "type"> & { id: string; label: string; error?: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[0.9375rem] font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="control pr-14"
          {...input}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label="Show password"
          aria-controls={id}
          className={`absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full transition-colors duration-300 ${
            shown ? "bg-sun text-on-sun" : "text-ink/70 hover:bg-ink/[0.06] hover:text-ink"
          }`}
        >
          <Icon name="eye" className="h-5 w-5" />
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-ink/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
