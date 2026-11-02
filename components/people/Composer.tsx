"use client";

/**
 * Composer — "Share something": the kind (Win, Finished, Thought, Question), the text, up to five
 * tags and who sees it (Everyone, or Friends: people who follow each other). Posts to
 * /api/moments and hands the new moment to onShared. With no handle yet, the handle step opens
 * in place of the Share button and the moment goes out once it's claimed.
 *
 * Props: me ({ name, hue }), onShared(moment), id? (for #share links).
 */

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { FormAlert } from "@/components/shared/TextField";
import { useToast } from "@/components/shared/Toast";
import type { MomentT, Visibility } from "@/lib/types";
import { api, failure } from "./api";
import { HandleClaim } from "./HandleClaim";
import { MOMENT_LABEL, SHARE_KINDS, hue8 } from "./labels";
import { normalizeTag } from "./view";
import { useViewerHandle } from "./viewer";

type ShareKind = (typeof SHARE_KINDS)[number];

const PROMPT: Record<ShareKind, string> = {
  win: "What went right?",
  ship: "What did you finish?",
  thought: "What’s on your mind?",
  question: "What would you like to ask?",
};

const MAX = 500;
const MAX_TAGS = 5;

export function Composer({
  me,
  onShared,
  id = "share",
}: {
  me: { name: string; hue: number };
  onShared: (moment: MomentT) => void;
  id?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const handle = useViewerHandle();
  const [kind, setKind] = useState<ShareKind>("win");
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const kindButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const seeButtons = useRef<(HTMLButtonElement | null)[]>([]);

  // The box grows with what's written.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const pendingTag = normalizeTag(tagDraft);
  const allTags = pendingTag && !tags.includes(pendingTag) && tags.length < MAX_TAGS ? [...tags, pendingTag] : tags;
  const left = MAX - text.length;

  function addTags(raw: string) {
    const fresh = raw
      .split(",")
      .map(normalizeTag)
      .filter(Boolean);
    setTags((ts) => [...new Set([...ts, ...fresh])].slice(0, MAX_TAGS));
  }

  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (!tagDraft.trim()) return;
      if (e.key !== "Tab") e.preventDefault();
      addTags(tagDraft);
      setTagDraft("");
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags((ts) => ts.slice(0, -1));
    }
  }

  function roving<T extends string>(
    e: KeyboardEvent<HTMLDivElement>,
    options: readonly T[],
    current: T,
    set: (v: T) => void,
    buttons: (HTMLButtonElement | null)[]
  ) {
    const i = options.indexOf(current);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    set(options[next]);
    buttons[next]?.focus();
  }

  async function share(e?: FormEvent, knownHandle = false) {
    e?.preventDefault();
    const body = text.trim();
    if (sending) return;
    if (!body) {
      setError("Write something to share first.");
      area.current?.focus();
      return;
    }
    if (handle === null && !knownHandle) {
      setAsking(true);
      return;
    }
    setSending(true);
    setError(null);
    const r = await api<MomentT>("/api/moments", {
      method: "POST",
      body: { text: body, kind, tags: allTags, visibility },
    });
    setSending(false);
    if (r.ok) {
      setText("");
      setTags([]);
      setTagDraft("");
      toast(visibility === "friends" ? "Shared with your friends." : "Shared.", "success");
      onShared(r.data);
      if (knownHandle) router.refresh();
    } else if (r.needsHandle) {
      setAsking(true);
    } else {
      setError(failure(r, "Couldn’t share that. Try again."));
    }
  }

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="card scroll-mt-24 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Avatar name={me.name} hue={me.hue} size={44} />
        <div className="min-w-0">
          <h2 id={`${id}-heading`} className="font-display text-display-s">
            Share something
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink/65">Your pages stay private. Only what you post here is seen.</p>
        </div>
      </div>

      <form onSubmit={share} className="mt-5">
        <div
          role="radiogroup"
          aria-label="What kind of moment"
          onKeyDown={(e) => roving(e, SHARE_KINDS, kind, setKind, kindButtons.current)}
          className="flex flex-wrap gap-1.5 sm:gap-2"
        >
          {SHARE_KINDS.map((k, i) => (
            <button
              key={k}
              ref={(el) => {
                kindButtons.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={kind === k}
              tabIndex={kind === k ? 0 : -1}
              onClick={() => setKind(k)}
              className="chip chip-sm min-h-11 px-2.5 text-[0.8125rem] sm:px-3.5 sm:text-[0.875rem] lg:min-h-10"
            >
              {MOMENT_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="well mt-3 transition-shadow duration-300 focus-within:shadow-[inset_0_0_0_2px_var(--accent)]">
          <label htmlFor={`${id}-text`} className="sr-only">
            {PROMPT[kind]}
          </label>
          <textarea
            ref={area}
            id={`${id}-text`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void share();
            }}
            rows={2}
            maxLength={MAX}
            placeholder={PROMPT[kind]}
            aria-describedby={`${id}-hint`}
            className="writing block min-h-[4.75rem] px-4 pb-2 pt-3.5 text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-snug"
          />
          <div className="rule flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t-2 border-dashed px-3 py-1.5" data-hue={hue8(me.hue)}>
            <Icon name="hash" className="h-4 w-4 text-ink/55" />
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTags((ts) => ts.filter((x) => x !== t))}
                aria-label={`Remove tag ${t}`}
                className="group inline-flex min-h-11 items-center"
              >
                <span className="tag gap-1 pr-1.5">
                  #{t}
                  <Icon name="close" className="h-3 w-3 opacity-70 group-hover:opacity-100" strokeWidth={2.4} />
                </span>
              </button>
            ))}
            {tags.length < MAX_TAGS ? (
              <>
                <label htmlFor={`${id}-tag`} className="sr-only">
                  Add a tag
                </label>
                <input
                  id={`${id}-tag`}
                  value={tagDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.includes(",")) {
                      addTags(v);
                      setTagDraft("");
                    } else setTagDraft(v.slice(0, 32));
                  }}
                  onKeyDown={onTagKey}
                  onBlur={() => {
                    if (tagDraft.trim()) {
                      addTags(tagDraft);
                      setTagDraft("");
                    }
                  }}
                  placeholder={tags.length ? "Another tag" : "Add tags, like design or running"}
                  autoComplete="off"
                  className="h-11 min-w-[9rem] flex-1 bg-transparent px-1 text-[0.9375rem] placeholder:text-ink/55 focus:outline-none"
                />
              </>
            ) : (
              <span className="px-1 text-[0.8125rem] text-ink/65">Five tags at most</span>
            )}
          </div>
        </div>

        {asking ? null : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
            <div
              role="radiogroup"
              aria-label="Who sees it"
              onKeyDown={(e) => roving(e, ["public", "friends"] as const, visibility, setVisibility, seeButtons.current)}
              className="scale min-w-0 flex-[0_1_12.25rem] sm:flex-[0_1_15rem]"
            >
              {(
                [
                  ["public", "Everyone", "globe"],
                  ["friends", "Friends", "lock"],
                ] as const
              ).map(([v, label, icon], i) => (
                <button
                  key={v}
                  ref={(el) => {
                    seeButtons.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={visibility === v}
                  tabIndex={visibility === v ? 0 : -1}
                  onClick={() => setVisibility(v)}
                  className="scale-step scale-row min-h-11 gap-1.5 px-1.5 text-[0.8125rem] focus-visible:-outline-offset-4 sm:px-2 sm:text-[0.875rem]"
                >
                  <Icon name={icon} className="h-4 w-4" strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3">
              {left <= 80 ? (
                <span className={`text-[0.8125rem] tabular-nums ${left <= 20 ? "font-semibold text-bad" : "text-ink/65"}`} aria-live="polite">
                  {left} left
                </span>
              ) : null}
              <Button type="submit" disabled={sending} className="px-4 sm:min-w-28 sm:px-5">
                {sending ? "Sharing…" : "Share"}
                {sending ? null : <Icon name="send" className="h-4 w-4 max-sm:hidden" />}
              </Button>
            </div>
          </div>
        )}
        <p id={`${id}-hint`} className="sr-only">
          {visibility === "friends"
            ? "Friends only: people you follow who follow you back."
            : "Everyone signed in to Kata can see it."}{" "}
          Press Control or Command and Enter to share.
        </p>
        {visibility === "friends" && !asking ? (
          <p className="mt-2.5 text-[0.8125rem] text-ink/65">Friends are people you follow who follow you back.</p>
        ) : null}
      </form>

      {asking ? (
        <HandleClaim
          className="mt-4"
          purpose="to share this"
          onCancel={() => {
            setAsking(false);
            area.current?.focus();
          }}
          onClaimed={() => {
            setAsking(false);
            void share(undefined, true);
          }}
        />
      ) : null}
      {error ? (
        <div className="mt-4">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}
    </section>
  );
}
