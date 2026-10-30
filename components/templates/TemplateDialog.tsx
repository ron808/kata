"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { FormPreview } from "@/components/entry/FormPreview";
import { Avatar } from "@/components/shared/Avatar";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { plural, usedBy, type GalleryPage } from "./data";
import { MakeItMineActions, MakeItMinePanel } from "./MakeItMinePanel";
import { useMakeItMine, type Then } from "./useMakeItMine";

/**
 * A page opened from the gallery: the whole page to try on one side, Make it
 * mine on the other. A native modal dialog: the rest of the app is inert while
 * it's open, Escape closes it and focus goes back to the card that opened it.
 */
/** Who made a page in the gallery, when they put their name on it. */
export interface PageAuthor {
  name: string;
  handle: string;
  hue: number;
}

export function TemplateDialog({
  dialogRef,
  page,
  author,
  open,
  seq,
  onClose,
  onDone,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  page: GalleryPage | null;
  author?: PageAuthor;
  open: boolean;
  /** Bumped on every open, so each visit starts from the page as published. */
  seq: number;
  onClose: () => void;
  onDone: (name: string, then: Then) => void;
}) {
  const downOnBackdrop = useRef(false);
  // While a page is being saved the sheet stays up, so a failure is never hidden.
  const busy = useRef(false);
  const setBusy = useCallback((b: boolean) => {
    busy.current = b;
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open, dialogRef]);

  // The page behind stays put while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="tpl-dialog-title"
      aria-describedby="tpl-dialog-desc"
      onClose={onClose}
      onCancel={(e) => {
        if (busy.current) e.preventDefault();
      }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (!busy.current && downOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
      className="group fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none items-end justify-center bg-transparent p-0 text-ink opacity-0 transition-[opacity,display,overlay] duration-300 ease-out transition-discrete backdrop:bg-[rgb(20_13_6/0.6)] backdrop:opacity-0 backdrop:transition-[opacity,display,overlay] backdrop:duration-300 backdrop:transition-discrete open:flex open:opacity-100 open:backdrop:opacity-100 starting:open:opacity-0 starting:open:backdrop:opacity-0 lg:items-center"
    >
      {page ? <Sheet key={`${page.key}-${seq}`} page={page} author={author} onClose={onClose} onDone={onDone} onBusy={setBusy} /> : null}
    </dialog>
  );
}

function Sheet({
  page,
  author,
  onClose,
  onDone,
  onBusy,
}: {
  page: GalleryPage;
  author?: PageAuthor;
  onClose: () => void;
  onDone: (name: string, then: Then) => void;
  onBusy: (busy: boolean) => void;
}) {
  const mine = useMakeItMine(page, { onDone });
  const [view, setView] = useState<"choose" | "try">("choose");
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    onBusy(Boolean(mine.busy));
  }, [mine.busy, onBusy]);

  // Start at the top of the sheet: its title, not the first button.
  useEffect(() => {
    title.current?.focus();
  }, []);

  const source =
    page.source === "starter" ? (
      <span className="inline-flex items-center gap-1.5">
        <Seal size={18} style={{ ["--seal-cut" as string]: "var(--tint)" }} />
        A starter from Kata · {plural(mine.questions.length, "question")}
      </span>
    ) : (
      <>
        From people · {plural(mine.questions.length, "question")} · {usedBy(page.cloneCount)}
      </>
    );

  return (
    <div
      data-hue={page.hue}
      className="relative flex h-[calc(100svh-0.75rem)] w-full translate-y-6 flex-col overflow-hidden rounded-t-xl border-2 border-b-0 border-edge bg-surface transition-[translate] duration-500 ease-out group-open:translate-y-0 starting:group-open:translate-y-6 lg:h-[min(48rem,calc(100svh-3rem))] lg:w-[min(68rem,calc(100vw-3rem))] lg:translate-y-3 lg:rounded-xl lg:border-b-2 lg:shadow-[6px_6px_0_var(--edge)] lg:starting:group-open:translate-y-3"
    >
      <header className="shrink-0 border-b-2 border-edge bg-tint px-5 pb-4 pt-4 sm:px-7 sm:pt-5 [@media(max-height:40rem)]:pb-3 [@media(max-height:40rem)]:pt-3">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-deep">{source}</p>
            <h2
              id="tpl-dialog-title"
              ref={title}
              tabIndex={-1}
              className="mt-1.5 font-display text-display-s focus-visible:outline-none"
            >
              {page.name}
            </h2>
            <p id="tpl-dialog-desc" className="mt-2 line-clamp-2 max-w-[60ch] text-[0.9375rem] text-ink/75 [@media(max-height:40rem)]:line-clamp-1">
              {page.description || "No description yet."}
            </p>
            {page.tags.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5 [@media(max-height:40rem)]:hidden" aria-label="Tags">
                {page.tags.slice(0, 4).map((t) => (
                  <li key={t} className="tag">
                    #{t}
                  </li>
                ))}
              </ul>
            ) : null}
            {author ? <AskTheMaker author={author} page={page.name} /> : null}
          </div>
          <button type="button" onClick={onClose} disabled={Boolean(mine.busy)} aria-label="Close" className="chip !h-11 !w-11 shrink-0 !px-0">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Phones: one side at a time. */}
      <div className="shrink-0 px-5 pt-4 sm:px-7 lg:hidden">
        <div className="scale" role="group" aria-label="Show">
          <button type="button" aria-pressed={view === "choose"} aria-controls="tpl-choose" onClick={() => setView("choose")} className="scale-step scale-row">
            <Icon name="check" className="h-4 w-4" />
            Make it mine
          </button>
          <button type="button" aria-pressed={view === "try"} aria-controls="tpl-try" onClick={() => setView("try")} className="scale-step scale-row">
            <Icon name="pen" className="h-4 w-4" />
            Try the page
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section
          id="tpl-choose"
          aria-labelledby="tpl-choose-title"
          className={`h-full overflow-y-auto overscroll-contain px-5 pb-8 pt-5 sm:px-7 lg:border-r-2 lg:border-edge lg:pt-6 ${
            view === "choose" ? "" : "max-lg:hidden"
          }`}
        >
          <h3 id="tpl-choose-title" className="font-display text-[1.6rem] leading-none max-lg:sr-only">
            Make it mine
          </h3>
          <div className="lg:mt-5">
            <MakeItMinePanel mine={mine} idPrefix="tpl" />
          </div>
        </section>
        <section
          id="tpl-try"
          aria-labelledby="tpl-try-title"
          className={`h-full overflow-y-auto overscroll-contain bg-raised px-5 pb-10 pt-5 sm:px-8 lg:pt-6 ${
            view === "try" ? "" : "max-lg:hidden"
          }`}
        >
          <p id="tpl-try-title" className="text-sm font-semibold">
            <span className="max-lg:sr-only">Try the page · </span>
            <span className="font-normal text-ink/65">Nothing you write here is saved.</span>
          </p>
          <div className="mt-6">
            {mine.kept.length ? (
              <FormPreview fields={mine.kept} />
            ) : (
              <p className="text-ink/70">Every question is dropped. Keep one to see the page.</p>
            )}
          </div>
        </section>
      </div>

      <footer className="shrink-0 border-t-2 border-edge bg-surface px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-7">
        <MakeItMineActions mine={mine} idPrefix="tpl" className="lg:flex lg:justify-end" />
      </footer>
    </div>
  );
}

/** The person who made the page put their name on it: write to them about how it's going. */
function AskTheMaker({ author, page }: { author: PageAuthor; page: string }) {
  const first = author.name.split(/\s+/)[0] || author.name;
  const draft = `Hi ${first}, I found your page “${page}” in the gallery. How has it worked for you?`;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <Link href={`/u/${author.handle}`} className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-deep underline-offset-4 hover:underline">
        <Avatar name={author.name} hue={author.hue} size={28} />
        By {author.name}
      </Link>
      <Link href={`/messages/${author.handle}?draft=${encodeURIComponent(draft)}`} className="chip chip-sm">
        <Icon name="chat" className="h-4 w-4" />
        Ask {first} about it
      </Link>
    </div>
  );
}
