"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/Icon";
import { cleanHandle, handleProblem } from "@/components/onboarding/script";

export type HandleStatus =
  | { state: "empty" }
  | { state: "invalid"; message: string }
  | { state: "checking" }
  | { state: "free"; handle: string }
  | { state: "yours"; handle: string }
  | { state: "taken"; message: string }
  | { state: "unknown"; message: string };

/** Whether `raw` can be claimed: the local rule at once, then the server (taken, reserved) as you pause. */
export function useHandleStatus(raw: string, current: string | null): HandleStatus {
  const handle = cleanHandle(raw);
  const problem = handleProblem(handle);
  const needsCheck = Boolean(handle) && !problem && handle !== current;
  const [result, setResult] = useState<{ handle: string; ok: boolean; reason?: string; failed?: boolean } | null>(null);

  useEffect(() => {
    if (!needsCheck) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/handle?h=${encodeURIComponent(handle)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { ok: boolean; reason?: string };
        setResult({ handle, ok: Boolean(data.ok), reason: data.reason });
      } catch {
        if (!ctrl.signal.aborted) setResult({ handle, ok: false, failed: true });
      }
    }, 320);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [handle, needsCheck]);

  if (!handle) return { state: "empty" };
  if (problem) return { state: "invalid", message: problem };
  if (handle === current) return { state: "yours", handle };
  if (!result || result.handle !== handle) return { state: "checking" };
  if (result.failed) return { state: "unknown", message: "Couldn’t check that just now. You can still try it." };
  return result.ok
    ? { state: "free", handle }
    : { state: "taken", message: result.reason ?? "That handle isn’t available." };
}

/** Typing "@Sam Rivera" gives "sam_rivera": the field keeps to what a handle can be. */
export function tidyHandleInput(value: string) {
  return value.replace(/^@+/, "").replace(/\s+/g, "_").toLowerCase().slice(0, 24);
}

export function HandleField({
  id,
  label = "Handle",
  value,
  onChange,
  status,
  emptyHint = "Letters, numbers and underscores, 3 to 24 of them.",
  error,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  status: HandleStatus;
  emptyHint?: string;
  /** A server error from saving, shown instead of the live status. */
  error?: string | null;
}) {
  const bad = Boolean(error) || status.state === "invalid" || status.state === "taken";
  const message = error ? (
    error
  ) : status.state === "empty" ? (
    emptyHint
  ) : status.state === "invalid" || status.state === "taken" || status.state === "unknown" ? (
    status.message
  ) : status.state === "checking" ? (
    "Checking…"
  ) : status.state === "yours" ? (
    "That’s your handle."
  ) : (
    <>
      <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
      <span>
        <span className="font-semibold">@{status.handle}</span> is free.
      </span>
    </>
  );

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[0.9375rem] font-semibold">
        {label}
      </label>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-ink/60">
          @
        </span>
        <input
          id={id}
          className="control pl-9"
          value={value}
          onChange={(e) => onChange(tidyHandleInput(e.target.value))}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          maxLength={24}
          aria-invalid={bad}
          aria-describedby={`${id}-status`}
        />
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={`mt-2 flex min-h-5 items-center gap-1.5 text-sm ${
          bad ? "font-medium text-bad" : status.state === "free" ? "text-ok" : "text-ink/65"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
