import type { ComponentProps } from "react";

/** A labelled text input with an optional hint or error, wired for screen readers. */
export function TextField({
  id,
  label,
  error,
  hint,
  ...input
}: ComponentProps<"input"> & { id: string; label: string; error?: string; hint?: string }) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[0.9375rem] font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="control"
        {...input}
      />
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

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" aria-live="polite" data-hue="0" className="rounded-md border-2 border-edge bg-tint px-4 py-3 text-[0.9375rem] font-medium text-deep">
      {children}
    </div>
  );
}
