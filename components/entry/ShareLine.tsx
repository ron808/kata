"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { FormAlert } from "@/components/shared/TextField";
import { useToast } from "@/components/shared/Toast";
import { radioKeys, tabStop } from "./fields/radio";

/** A line someone could share: one sentence of an answer, with where it came from. */
export interface Passage {
  text: string;
  /** The prompt or question it answers. */
  from: string;
  /** The tag of the Kata question it answers, if it does. */
  tag: string | null;
}

export interface ShareTag {
  tag: string;
  hue: number;
}

const MAX = 500;
const MAX_TAGS = 5;
const AUDIENCES = ["public", "friends"] as const;
type Audience = (typeof AUDIENCES)[number];
const AUDIENCE: Record<Audience, { label: string; icon: "globe" | "people"; note: string }> = {
  public: { label: "Everyone", icon: "globe", note: "Anyone on Kata can see it on your profile." },
  friends: { label: "Friends", icon: "people", note: "Only people you follow who follow you back." },
};

type HandleCheck = { state: "idle" | "checking" | "ok" | "bad"; reason?: string };

/**
 * "Share a line": pick a sentence from this page (or write a caption), choose who sees it,
 * and post it as a moment. Writers without a handle claim one right here first.
 */
export function ShareLine({
  entryId,
  passages,
  tags,
  handle: initialHandle,
  suggestedHandle,
}: {
  entryId: string;
  passages: Passage[];
  tags: ShareTag[];
  handle: string | null;
  suggestedHandle: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);

  const [handle, setHandle] = useState(initialHandle);
  const [pick, setPick] = useState<number | null>(passages.length ? 0 : null);
  const [text, setText] = useState(passages[0]?.text ?? "");
  const [chosen, setChosen] = useState<string[]>(passages[0]?.tag ? [passages[0].tag] : []);
  const [audience, setAudience] = useState<Audience>("public");
  const [draftHandle, setDraftHandle] = useState(suggestedHandle ?? "");
  const [check, setCheck] = useState<HandleCheck>({ state: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedAs, setSharedAs] = useState<string | null>(null);

  const trimmed = text.trim();
  const canShare = trimmed.length > 0 && trimmed.length <= MAX && !busy && (handle ? true : check.state === "ok");

  function checkHandle(raw: string) {
    if (timer.current) clearTimeout(timer.current);
    request.current?.abort();
    const h = raw.trim().replace(/^@/, "").toLowerCase();
    if (!h) {
      setCheck({ state: "idle" });
      return;
    }
    setCheck({ state: "checking" });
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      request.current = ctrl;
      try {
        const res = await fetch(`/api/profile/handle?h=${encodeURIComponent(h)}`, { signal: ctrl.signal });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; error?: string };
        if (!res.ok) setCheck({ state: "bad", reason: data.error ?? "Couldn’t check that handle." });
        else setCheck(data.ok ? { state: "ok" } : { state: "bad", reason: data.reason ?? "That handle can’t be used." });
      } catch (err) {
        if ((err as Error).name !== "AbortError") setCheck({ state: "bad", reason: "Couldn’t check that handle." });
      }
    }, 350);
  }

  function open() {
    setError(null);
    dialog.current?.showModal();
    if (!handle && draftHandle && check.state === "idle") checkHandle(draftHandle);
    requestAnimationFrame(() => {
      dialog.current?.querySelector<HTMLElement>('[data-autofocus], [role="radio"][tabindex="0"], textarea')?.focus();
    });
  }

  function choose(i: number) {
    const p = passages[i];
    setPick(i);
    setText(p.text);
    if (p.tag && !chosen.includes(p.tag) && chosen.length < MAX_TAGS) setChosen([...chosen, p.tag]);
  }

  function toggleTag(tag: string) {
    setChosen((c) => (c.includes(tag) ? c.filter((t) => t !== tag) : c.length < MAX_TAGS ? [...c, tag] : c));
  }

  async function share(e: FormEvent) {
    e.preventDefault();
    if (!canShare) return;
    setBusy(true);
    setError(null);
    try {
      let as = handle;
      if (!as) {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: draftHandle }),
        });
        const data = (await res.json().catch(() => ({}))) as { handle?: string | null; error?: string };
        if (!res.ok || !data.handle) {
          setCheck({ state: "bad", reason: data.error ?? "That handle didn’t work. Try another." });
          return;
        }
        as = data.handle;
        setHandle(as);
      }
      const res = await fetch("/api/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, kind: "page", entryId, tags: chosen, visibility: audience }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 403) {
        // The account lost its handle somewhere else: ask for one again.
        setHandle(null);
        setError(data.error ?? "Choose a handle first.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "That didn’t share. Try again.");
        return;
      }
      setSharedAs(as);
      dialog.current?.close();
      toast(audience === "friends" ? "Shared with your friends" : "Shared to your profile", "success");
      // The shell shows the new handle once the server renders again.
      if (!initialHandle) router.refresh();
    } catch {
      setError("You seem to be offline. Nothing was shared.");
    } finally {
      setBusy(false);
    }
  }

  const counter = trimmed.length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={open} aria-haspopup="dialog">
          <Icon name="share" className="h-4 w-4" />
          Share a line
        </Button>
        {sharedAs ? (
          <p role="status" className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium">
            <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border-2 border-edge bg-sun text-on-sun">
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />
            </span>
            Shared.
            <Link href={`/u/${sharedAs}`} className="link">
              See it on your profile
            </Link>
          </p>
        ) : null}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="share-title"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto max-h-[min(48rem,calc(100svh-2rem))] w-[min(36rem,calc(100vw-2rem))] max-w-none overflow-y-auto overscroll-contain rounded-lg border-2 border-edge bg-surface p-0 text-ink shadow-sticker backdrop:bg-[rgb(22_18_14/0.55)] max-sm:mb-0 max-sm:max-h-[calc(100svh-1.5rem)] max-sm:w-full max-sm:rounded-b-none max-sm:border-b-0"
      >
        <form onSubmit={share} className="appear px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="share-title" className="font-display text-display-s">
                Share a line
              </h2>
              <p className="mt-2 text-[0.9375rem] text-ink/70">Only this line leaves your page. The rest stays private.</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="chip !h-11 !w-11 !min-h-0 shrink-0 !px-0"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          {passages.length > 0 ? (
            <fieldset className="mt-6">
              <legend className="text-[0.9375rem] font-semibold">Pick a line</legend>
              <div
                role="radiogroup"
                aria-label="Pick a line"
                onKeyDown={radioKeys(
                  passages.map((_, i) => i),
                  pick,
                  choose
                )}
                className="mt-3 grid grid-cols-1 gap-2.5"
              >
                {passages.map((p, i) => (
                  <button
                    key={`${i}-${p.text.slice(0, 24)}`}
                    type="button"
                    role="radio"
                    aria-checked={pick === i}
                    tabIndex={tabStop(pick === i, i, pick !== null)}
                    onClick={() => choose(i)}
                    className="group flex items-start gap-3 rounded-md border-2 border-edge bg-surface px-4 py-3 text-left transition-colors duration-300 aria-checked:bg-sun aria-checked:text-on-sun"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-edge bg-surface text-ink group-aria-checked:border-on-sun group-aria-checked:bg-on-sun group-aria-checked:text-sun"
                    >
                      {pick === i ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-3 text-[0.9375rem] font-medium leading-snug">{p.text}</span>
                      <span className="mt-1 block truncate text-[0.8125rem] opacity-75">{p.from}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="share-text" className="text-[0.9375rem] font-semibold">
                {passages.length ? "Your line" : "Write a line about today"}
              </label>
              <span className={`text-[0.8125rem] tabular-nums ${counter > MAX ? "font-semibold text-bad" : "text-ink/65"}`}>
                {counter}/{MAX}
              </span>
            </div>
            <textarea
              id="share-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (pick !== null && e.target.value !== passages[pick]?.text) setPick(null);
              }}
              rows={3}
              aria-describedby="share-text-hint"
              aria-invalid={counter > MAX}
              className="control mt-2 min-h-[6.5rem] resize-y leading-normal"
            />
            <p id="share-text-hint" className="mt-2 text-[0.8125rem] text-ink/65">
              {passages.length ? "Edit it, or write a caption of your own." : "A sentence or two is plenty."}
            </p>
          </div>

          {tags.length > 0 ? (
            <fieldset className="mt-6">
              <legend className="text-[0.9375rem] font-semibold">Tags</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    aria-pressed={chosen.includes(t.tag)}
                    onClick={() => toggleTag(t.tag)}
                    disabled={!chosen.includes(t.tag) && chosen.length >= MAX_TAGS}
                    className="chip chip-sm max-sm:!min-h-11"
                  >
                    <span aria-hidden data-hue={t.hue} className="h-2.5 w-2.5 rounded-full border-[1.5px] border-edge bg-hue" />
                    {`#${t.tag}`}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="mt-6">
            <legend className="text-[0.9375rem] font-semibold">Who sees it</legend>
            <div
              role="radiogroup"
              aria-label="Who sees it"
              onKeyDown={radioKeys(AUDIENCES, audience, setAudience)}
              className="scale mt-3 max-w-[22rem]"
            >
              {AUDIENCES.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={audience === a}
                  tabIndex={tabStop(audience === a, i, true)}
                  onClick={() => setAudience(a)}
                  className="scale-step scale-row !text-[0.9375rem] focus-visible:-outline-offset-4"
                >
                  <Icon name={AUDIENCE[a].icon} className="h-4 w-4" />
                  {AUDIENCE[a].label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[0.8125rem] text-ink/65">{AUDIENCE[audience].note}</p>
          </fieldset>

          {handle ? null : (
            <div className="well mt-6 p-4 sm:p-5">
              <label htmlFor="share-handle" className="text-[0.9375rem] font-semibold">
                Choose a handle first
              </label>
              <p className="mt-1 text-[0.875rem] text-ink/70">
                What you share is signed with it, and your profile lives at /u/{draftHandle.trim().replace(/^@/, "").toLowerCase() || "you"}.
              </p>
              <div className="relative mt-3">
                <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-ink/60">
                  @
                </span>
                <input
                  id="share-handle"
                  value={draftHandle}
                  onChange={(e) => {
                    setDraftHandle(e.target.value);
                    checkHandle(e.target.value);
                  }}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={24}
                  aria-invalid={check.state === "bad"}
                  aria-describedby="share-handle-status"
                  className="control !pl-9"
                />
              </div>
              <p
                id="share-handle-status"
                aria-live="polite"
                className={`mt-2 min-h-5 text-[0.8125rem] font-medium ${check.state === "bad" ? "text-bad" : check.state === "ok" ? "text-ok" : "text-ink/65"}`}
              >
                {check.state === "checking"
                  ? "Checking…"
                  : check.state === "ok"
                    ? "That one’s free."
                    : check.state === "bad"
                      ? check.reason
                      : "Lowercase letters, numbers and underscores."}
              </p>
            </div>
          )}

          {error ? (
            <div className="mt-6">
              <FormAlert>{error}</FormAlert>
            </div>
          ) : null}

          {/* The actions stay in reach while the rest of the sheet scrolls. */}
          <div className="rule sticky bottom-0 -mx-5 mt-7 flex flex-wrap items-center justify-end gap-3 border-t-2 bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:-mx-7 sm:px-7 sm:pb-6">
            <Button variant="quiet" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canShare}>
              {busy ? "Sharing…" : handle ? "Share" : "Claim and share"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
