"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyNote, Section } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { useToast } from "@/components/shared/Toast";
import { ROLE_FILTERS, matches, normTag, plural, type ActivePage, type Filter, type GalleryPage } from "./data";
import { DescribeYourDay } from "./DescribeYourDay";
import { ReadyBar } from "./ReadyBar";
import { TemplateCard } from "./TemplateCard";
import { TemplateDialog, type PageAuthor } from "./TemplateDialog";
import { YourPages } from "./YourPages";
import type { OwnPageT } from "@/lib/types";
import type { Then } from "./useMakeItMine";

/** The gallery: describe your day, filter, browse pages people use and Kata's starters, make one yours. */
export function Gallery({
  people,
  starters,
  active,
  mine,
  authors,
}: {
  people: GalleryPage[];
  starters: GalleryPage[];
  active: ActivePage | null;
  /** Their own pages, today's first. */
  mine: OwnPageT[];
  /** Who made a page, by template id, where they put their name on it. */
  authors: Record<string, PageAuthor>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { name: companionName } = useCompanion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [opened, setOpened] = useState<GalleryPage | null>(null);
  const [open, setOpen] = useState(false);
  const [seq, setSeq] = useState(0);
  const [ready, setReady] = useState<{ name: string; n: number } | null>(null);

  // Tags no role already covers get chips of their own.
  const tagChips = useMemo(() => {
    const covered = new Set(ROLE_FILTERS.flatMap((r) => r.tags));
    const counts = new Map<string, number>();
    for (const p of people) {
      for (const t of new Set(p.tags.map(normTag))) if (t && !covered.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([t]) => t);
  }, [people]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    ...ROLE_FILTERS.map((r) => ({ key: r.key as Filter, label: r.label })),
    ...tagChips.map((t) => ({ key: `tag:${t}` as Filter, label: `#${t}` })),
  ];
  const chosen = chips.find((c) => c.key === filter) ?? chips[0];
  const shownPeople = people.filter((p) => matches(p, filter));
  const shownStarters = starters.filter((p) => matches(p, filter));

  function openPage(page: GalleryPage) {
    setOpened(page);
    setSeq((s) => s + 1);
    setOpen(true);
  }

  function done(name: string, then: Then) {
    toast(`“${name}” is your daily page now. The one before stays in Your pages.`, "success");
    if (then === "builder") {
      router.push("/settings/template");
      return;
    }
    // Close now, so the dialog hands focus back before the bar takes it.
    dialogRef.current?.close();
    setOpen(false);
    setReady((r) => ({ name, n: (r?.n ?? 0) + 1 }));
    router.refresh();
  }

  const yours = (page: GalleryPage) => Boolean(active?.clonedFrom && page.templateId === active.clonedFrom);

  return (
    <>
      <YourPages pages={mine} />

      <div className="mt-10">
        <DescribeYourDay onDone={done} />
      </div>

      <div className="mt-14">
        <h2 id="filter-label" className="sr-only">
          Show pages for
        </h2>
        <ul
          aria-labelledby="filter-label"
          className="no-scrollbar -mx-margin flex snap-x gap-2.5 overflow-x-auto scroll-px-margin px-margin pb-2 pt-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {chips.map((c) => (
            <li key={c.key} className="shrink-0 snap-start">
              <button type="button" className="chip" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Section
        id="people-title"
        className="mt-10"
        title="From people"
        action={people.length ? <p className="shrink-0 text-sm tabular-nums text-ink/65">{plural(shownPeople.length, "page")}</p> : null}
      >
        {people.length === 0 ? (
          <EmptyNote
            action={
              <Link href="/settings" className={buttonClass({ variant: "secondary" })}>
                Publish yours
              </Link>
            }
          >
            No one has shared a page yet. When someone publishes theirs from Settings, it shows up here. Kata’s starters are
            below.
          </EmptyNote>
        ) : shownPeople.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-edge/45 px-5 py-6 text-ink/75">
            Nobody has shared a page for {chosen.label.toLowerCase()} yet.{" "}
            {shownStarters.length
              ? "Kata’s starter below is a good place to begin."
              : `Describe your day above and ${companionName} will draft one.`}
          </p>
        ) : (
          <CardList pages={shownPeople} yours={yours} onOpen={openPage} authors={authors} />
        )}
      </Section>

      {shownStarters.length ? (
        <Section
          id="starters-title"
          className="mt-14"
          title="Starters from Kata"
          action={<p className="shrink-0 text-sm text-ink/65">Simple pages to grow from</p>}
        >
          <CardList pages={shownStarters} yours={yours} onOpen={openPage} />
        </Section>
      ) : null}

      <TemplateDialog
        dialogRef={dialogRef}
        page={opened}
        author={opened?.templateId ? authors[opened.templateId] : undefined}
        open={open}
        seq={seq}
        onClose={() => setOpen(false)}
        onDone={done}
      />

      {ready ? <ReadyBar key={ready.n} name={ready.name} onDismiss={() => setReady(null)} /> : null}
    </>
  );
}

function CardList({
  pages,
  yours,
  onOpen,
  authors = {},
}: {
  pages: GalleryPage[];
  yours: (page: GalleryPage) => boolean;
  onOpen: (page: GalleryPage) => void;
  authors?: Record<string, PageAuthor>;
}) {
  return (
    <ul className="no-scrollbar max-sm:-mx-margin max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:gap-4 max-sm:overflow-x-auto max-sm:scroll-px-margin max-sm:px-margin max-sm:pb-4 max-sm:pt-1 sm:grid sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
      {pages.map((page, i) => (
        <li key={page.key} className="max-sm:w-[min(20rem,82vw)] max-sm:shrink-0 max-sm:snap-start">
          <TemplateCard page={page} index={i} yours={yours(page)} onOpen={onOpen} author={page.templateId ? authors[page.templateId] : undefined} />
        </li>
      ))}
    </ul>
  );
}
