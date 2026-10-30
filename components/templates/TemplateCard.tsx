"use client";

import { Seal } from "@/components/shared/Seal";
import { isQuestion, plural, questionCount, usedBy, type GalleryPage } from "./data";
import { MiniPage } from "./MiniPage";
import type { PageAuthor } from "./TemplateDialog";

const TILTS = [-1.6, 1.2, -0.7, 1.5, -1.1, 0.8];

/** A page in the gallery as a sticker: its colour's pocket holding the page, then its name and use. */
export function TemplateCard({
  page,
  index,
  yours,
  onOpen,
  author,
}: {
  page: GalleryPage;
  index: number;
  /** The writer's daily page came from this one. */
  yours: boolean;
  onOpen: (page: GalleryPage) => void;
  /** Who made it, if they put their name on it. */
  author?: PageAuthor;
}) {
  const metaId = `meta-${page.key}`;
  const n = questionCount(page.fields);
  return (
    <article
      data-hue={page.hue}
      className="card group flex h-full flex-col transition-[translate,box-shadow] duration-300 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-accent hover:-translate-x-px hover:-translate-y-px hover:shadow-[6px_6px_0_var(--edge)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--edge)]"
    >
      {/* Name first for screen readers; the pocket shows first on screen. */}
      <div className="order-2 flex flex-1 flex-col px-[clamp(1.25rem,4vw,1.75rem)] pb-5 pt-4">
        <h3 className="font-display text-[1.75rem] leading-[0.95] tracking-[-0.02em]">
          <button
            type="button"
            onClick={() => onOpen(page)}
            aria-describedby={metaId}
            aria-haspopup="dialog"
            className="-my-2.5 inline-block py-2.5 text-left after:absolute after:inset-0 after:z-[1] after:rounded-[22px] after:content-[''] focus-visible:outline-none"
          >
            {page.name}
          </button>
        </h3>
        <p className="mt-2 line-clamp-2 text-[0.9375rem] text-ink/70">{page.description || "No description yet."}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
          <p id={metaId} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/70">
            {page.source === "starter" ? (
              <>
                <Seal size={18} cut="surface" />
                From Kata · {plural(n, "question")}
              </>
            ) : (
              <>
                {author ? `By ${author.name.split(/\s+/)[0]} · ` : ""}
                {plural(n, "question")} · {usedBy(page.cloneCount)}
              </>
            )}
            {yours ? <span className="sr-only">. Your daily page came from this one.</span> : null}
          </p>
          {page.tags.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
              {page.tags.slice(0, 2).map((t) => (
                <li key={t} className="tag">
                  #{t}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* The page tucked into a pocket of its colour; it peeks up on hover. */}
      <div className="relative order-1 h-[12.5rem] overflow-hidden rounded-t-[22px] border-b-2 border-edge bg-tint px-[clamp(1.25rem,4vw,1.75rem)] pt-7">
        <MiniPage
          fields={page.fields.filter(isQuestion)}
          max={4}
          more={false}
          tilt={TILTS[index % TILTS.length]}
          tape={page.hue}
          className="mx-auto max-w-[19rem] transition-[translate] duration-500 ease-out group-hover:-translate-y-1.5"
        />
      </div>

      {yours ? (
        <span aria-hidden className="tag absolute right-3 top-3 z-[2] rotate-3 bg-sun text-on-sun">
          Your page
        </span>
      ) : null}
    </article>
  );
}
