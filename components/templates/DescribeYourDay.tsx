"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { KataMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import type { TemplateField } from "@/lib/types";
import { isQuestion, plural, type GalleryPage } from "./data";
import { MakeItMineActions, MakeItMinePanel } from "./MakeItMinePanel";
import { MiniPage } from "./MiniPage";
import { useMakeItMine, type Then } from "./useMakeItMine";

// Short labels; the sentence that goes in the box says a little more.
const EXAMPLES = [
  { label: "I run a small bakery", text: "I run a small bakery. Early mornings, regulars and a lot of customers." },
  { label: "Training for a half marathon", text: "Training for a half marathon and trying to sleep more." },
  { label: "Writing my thesis", text: "Writing my thesis in my final year of university." },
  { label: "Looking for work", text: "Job hunting and practising for interviews." },
  { label: "A side project after work", text: "Shipping a side project after my day job as a developer." },
  { label: "New parent", text: "New parent, back at work, short on sleep." },
];

const DRAFT_HUES = [1, 3, 5, 2, 7, 4];

type Status = "idle" | "drafting" | "done" | "error";

/** Describe your days in a sentence; Kata drafts a page you can trim, rename and use. */
export function DescribeYourDay({ onDone }: { onDone: (name: string, then: Then) => void }) {
  const { name: companionName } = useCompanion();
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [draft, setDraft] = useState<GalleryPage | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const seq = useRef(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef<HTMLDivElement>(null);

  // A new draft lands below the fold on short screens: bring it into view.
  useEffect(() => {
    if (!draft) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    draftRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [draft]);

  async function draftPage(raw: string) {
    const description = raw.trim().slice(0, 500);
    if (!description || status === "drafting") return;
    const n = ++seq.current;
    setAsked(description);
    setStatus("drafting");
    setProblem(null);
    try {
      const res = await fetch("/api/templates/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = (await res.json().catch(() => ({}))) as { name?: string; fields?: TemplateField[] };
      if (n !== seq.current) return;
      if (!res.ok || !data.fields?.length) {
        throw new Error(
          res.status === 429
            ? "I’ve drafted a lot this minute. Try again shortly."
            : res.status === 401
              ? "Your session ended. Sign in again and I’ll try once more."
              : "Try again in a moment."
        );
      }
      const name = data.name?.trim() || "My daily page";
      setDraft({
        key: `draft:${n}`,
        source: "draft",
        templateId: null,
        name,
        saveName: name,
        // The writer's own sentence says what the page is for better than any summary.
        description,
        tags: [],
        fields: data.fields,
        cloneCount: 0,
        hue: DRAFT_HUES[n % DRAFT_HUES.length],
        roles: [],
      });
      setStatus("done");
    } catch (err) {
      if (n !== seq.current) return;
      setStatus("error");
      setProblem(err instanceof Error ? err.message : "Try again in a moment.");
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void draftPage(text);
  }

  // Enter sends, as in a chat; Shift+Enter starts a new line.
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void draftPage(text);
    }
  }

  function startOver() {
    setDraft(null);
    setStatus("idle");
    setAsked(null);
    setText("");
    box.current?.focus();
  }

  const drafting = status === "drafting";

  return (
    <div>
      <section aria-labelledby="describe-title" className="card p-5 sm:p-7">
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <KataMark size={40} cut="surface" />
              <div className="min-w-0">
                <h2 id="describe-title" className="font-display text-[1.75rem] leading-none">
                  Describe your day
                </h2>
                <p className="mt-1 text-sm text-ink/65">{companionName} drafts a page from it.</p>
              </div>
            </div>

            <ol className="mt-5 space-y-3" aria-live="polite">
              <li>
                <p className="bubble-kata inline-block max-w-[36ch] px-4 py-3">
                  Tell me what your days are made of, and I’ll draft a page with questions for them.
                </p>
              </li>
              {asked ? (
                <li className="appear flex justify-end">
                  <p className="bubble-you max-w-[32ch] px-4 py-2.5 font-medium [overflow-wrap:anywhere]">{asked}</p>
                </li>
              ) : null}
              {drafting ? (
                <li>
                  <span className="bubble-kata inline-flex px-4 py-4">
                    <span className="typing" role="status" aria-label={`${companionName} is drafting your page`}>
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                </li>
              ) : null}
              {status === "done" && draft ? (
                <li key={draft.key} className="appear">
                  <p className="bubble-kata inline-block max-w-[36ch] px-4 py-3">
                    Here’s a draft with {plural(draft.fields.filter(isQuestion).length, "question")}. Keep the ones that fit
                    and drop the rest.
                  </p>
                </li>
              ) : null}
              {status === "error" ? (
                <li className="appear">
                  <p className="bubble-kata inline-block max-w-[36ch] px-4 py-3">I couldn’t draft that just now. {problem}</p>
                </li>
              ) : null}
            </ol>

            <form onSubmit={submit} className="mt-5 flex items-end gap-2.5">
              <label htmlFor="describe-box" className="sr-only">
                Describe your day
              </label>
              <textarea
                id="describe-box"
                ref={box}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKey}
                rows={2}
                maxLength={500}
                placeholder="I teach in the mornings and paint after dinner…"
                className="control min-h-[5.25rem] flex-1 resize-none leading-snug"
              />
              <button
                type="submit"
                disabled={!text.trim() || drafting}
                aria-label="Draft my page"
                className="press grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-full border-2 border-edge bg-accent text-on-accent transition-[transform,box-shadow,opacity] duration-300 ease-out disabled:pointer-events-none disabled:opacity-50"
              >
                <Icon name="send" className="h-5 w-5" strokeWidth={2} />
              </button>
            </form>
          </div>

          <div className="rule min-w-0 max-xl:border-t-2 max-xl:pt-5 xl:border-l-2 xl:pl-10">
            <p id="examples-label" className="text-[0.9375rem] font-semibold">
              Or start from one of these
            </p>
            <ul
              aria-labelledby="examples-label"
              className="no-scrollbar -mx-5 mt-3 flex snap-x gap-2.5 overflow-x-auto scroll-px-5 px-5 pb-1.5 pt-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {EXAMPLES.map((ex) => (
                <li key={ex.label} className="shrink-0 snap-start">
                  <button
                    type="button"
                    className="chip"
                    disabled={drafting}
                    onClick={() => {
                      setText(ex.text);
                      void draftPage(ex.text);
                    }}
                  >
                    {ex.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[42ch] text-sm text-ink/65">
              {companionName} picks the questions from what you write. Nothing is saved until you use the page.
            </p>
          </div>
        </div>
      </section>

      {draft && status !== "drafting" ? (
        <div ref={draftRef} className="mt-7 scroll-mb-28">
          <Draft key={draft.key} page={draft} onDone={onDone} onStartOver={startOver} />
        </div>
      ) : null}
    </div>
  );
}

function Draft({
  page,
  onDone,
  onStartOver,
}: {
  page: GalleryPage;
  onDone: (name: string, then: Then) => void;
  onStartOver: () => void;
}) {
  const mine = useMakeItMine(page, { onDone });

  if (mine.done) {
    return (
      <section data-hue={page.hue} aria-label="Your draft" className="card appear flex flex-col items-center px-6 py-10 text-center">
        <Seal size={56} cut="surface" title="Saved" />
        <p className="mt-5 font-display text-display-s">It’s your page now</p>
        <p className="mt-2 max-w-[38ch] text-ink/75">
          {mine.name.trim()} is the page you’ll fill in each day. Change it whenever you like in the builder.
        </p>
        <Button variant="secondary" className="mt-6" onClick={onStartOver}>
          <Icon name="refresh" className="h-4 w-4" />
          Draft another
        </Button>
      </section>
    );
  }

  return (
    <section data-hue={page.hue} aria-labelledby="draft-title" className="card appear p-5 sm:p-7">
      <span className="tape" aria-hidden />
      <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="draft-title" className="font-display text-[1.75rem] leading-none">
              Your draft
            </h2>
            <button type="button" onClick={onStartOver} className="link min-h-11 text-sm font-medium text-ink/75">
              Start over
            </button>
          </div>
          <div className="mt-4">
            <MakeItMinePanel mine={mine} idPrefix="draft" />
          </div>
          <MakeItMineActions mine={mine} idPrefix="draft" className="mt-6" />
        </div>
        <div aria-hidden className="hidden lg:block">
          <div className="h-full rounded-md bg-tint px-5 pb-6 pt-8">
            <MiniPage name={mine.name.trim() || "Untitled"} fields={mine.kept} max={8} tilt={1.4} tape={page.hue} />
          </div>
        </div>
      </div>
    </section>
  );
}
