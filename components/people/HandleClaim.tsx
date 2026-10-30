"use client";

/**
 * HandleClaim — the inline "Pick a handle" step. Following, reacting, replying and sharing all
 * need a handle; wherever one is tried without, this stands in for the action until it's done.
 *
 *   <HandleClaim purpose="to react" onClaimed={(handle) => retry()} onCancel={close} />
 *
 * Props: purpose (finishes "Pick a handle …"), onClaimed(handle), onCancel? (shows "Not now"),
 * suggested? (else the PeopleProvider's suggestion, else one fetched from /api/profile),
 * autoFocus? (true), framed? ("inline", a note inside a card, or "dialog", a sticker of its
 * own), className? (spacing). Availability is checked as you type (/api/profile/handle);
 * saving is PATCH /api/profile. It's a <form>: render it outside other forms.
 */

import { useEffect, useEffectEvent, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import { api } from "./api";
import { rememberHandle, useSuggestedHandle } from "./viewer";

const tidy = (raw: string) => raw.trim().replace(/^@+/, "").toLowerCase();

/** The rules lib/social/handles enforces, checked here first so most typing needs no request. */
function problemWith(handle: string): string | null {
  if (!handle) return "";
  if (handle.length < 3) return "Handles need at least 3 characters.";
  if (handle.length > 24) return "Handles can be at most 24 characters.";
  if (!/^[a-z0-9_]+$/.test(handle)) return "Use only lowercase letters, numbers and underscores.";
  return null;
}

type Check = { handle: string; ok: boolean; reason?: string };

export function HandleClaim({
  purpose,
  onClaimed,
  onCancel,
  suggested,
  autoFocus = true,
  framed = "inline",
  className = "",
}: {
  purpose: string;
  onClaimed: (handle: string) => void;
  onCancel?: () => void;
  suggested?: string;
  autoFocus?: boolean;
  framed?: "inline" | "dialog";
  className?: string;
}) {
  const { toast } = useToast();
  const id = useId();
  const fallback = useSuggestedHandle();
  const initial = suggested ?? fallback ?? "";
  const [value, setValue] = useState(initial);
  const [check, setCheck] = useState<Check | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = tidy(value);
  const problem = problemWith(handle);

  const claimed = useEffectEvent((h: string) => onClaimed(h));
  const suggest = useEffectEvent((h: string) => setValue((v) => v || h));

  // Nothing to start from: the profile has a suggestion, or says a handle is already set.
  useEffect(() => {
    if (initial) return;
    let live = true;
    api<{ handle: string | null; suggestedHandle?: string }>("/api/profile").then((r) => {
      if (!live || !r.ok) return;
      if (r.data.handle) {
        rememberHandle(r.data.handle);
        claimed(r.data.handle);
      } else if (r.data.suggestedHandle) {
        suggest(r.data.suggestedHandle);
      }
    });
    return () => {
      live = false;
    };
  }, [initial]);

  // Is it free? Asked once typing pauses.
  useEffect(() => {
    if (problem !== null) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      api<{ ok: boolean; reason?: string }>(`/api/profile/handle?h=${encodeURIComponent(handle)}`, { signal: ctrl.signal })
        .then((r) => setCheck(r.ok ? { handle, ok: r.data.ok, reason: r.data.reason } : { handle, ok: true }))
        .catch(() => {});
    }, 280);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [handle, problem]);

  const known = check?.handle === handle ? check : null;
  const state: "empty" | "bad" | "checking" | "ok" =
    problem === "" ? "empty" : problem ? "bad" : !known ? "checking" : known.ok ? "ok" : "bad";
  const message = error
    ? error
    : state === "empty"
      ? "Type the handle you’d like."
      : state === "bad"
        ? (problem ?? known?.reason ?? "That handle can’t be used.")
        : state === "checking"
          ? "Checking…"
          : `@${handle} is free.`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (problem !== null) {
      setError(problem || "Type the handle you’d like.");
      return;
    }
    setSaving(true);
    setError(null);
    const r = await api<{ handle: string | null }>("/api/profile", { method: "PATCH", body: { handle } });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      if (r.status === 409) setCheck({ handle, ok: false, reason: r.error });
      return;
    }
    const saved = r.data.handle ?? handle;
    rememberHandle(saved);
    toast(`You’re @${saved} now.`, "success");
    onClaimed(saved);
  }

  const tone = error || state === "bad" ? "text-bad" : state === "ok" ? "text-ok" : "text-ink/70";

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      data-hue="1"
      className={`appear border-2 border-edge bg-tint text-ink ${framed === "dialog" ? "rounded-lg p-5 shadow-sticker sm:p-6" : "rounded-md p-4"} ${className}`}
    >
      <p id={`${id}-title`} className="font-semibold leading-snug">
        Pick a handle {purpose}
      </p>
      <p className="mt-0.5 text-[0.875rem] text-ink/70">It’s how people find you. You can change it in settings.</p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <div className="relative min-w-0 flex-[1_1_11rem]">
          <label htmlFor={`${id}-input`} className="sr-only">
            Handle
          </label>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-ink/55">
            @
          </span>
          <input
            id={`${id}-input`}
            className="control pl-9"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            maxLength={30}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={autoFocus}
            aria-invalid={Boolean(error) || state === "bad"}
            aria-describedby={`${id}-status`}
          />
        </div>
        <Button type="submit" size="lg" disabled={saving || state === "bad"} className="max-xs:w-full">
          {saving ? "Saving…" : "Claim handle"}
        </Button>
      </div>
      <p id={`${id}-status`} aria-live="polite" className={`mt-2 flex min-h-6 items-center gap-1.5 text-[0.875rem] font-medium ${tone}`}>
        {state === "ok" && !error ? <Icon name="check" className="h-4 w-4" strokeWidth={2.4} /> : null}
        {message}
      </p>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="-mb-2 mt-1 inline-flex min-h-11 items-center text-[0.875rem] font-semibold text-ink/70 underline-offset-4 hover:text-ink hover:underline"
        >
          Not now
        </button>
      ) : null}
    </form>
  );
}
