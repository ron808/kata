"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { MaruMark } from "@/components/shared/Avatar";
import { formatRange } from "@/lib/utils/dates";
import type { DigestSummary } from "@/lib/types";
import type { NextLetter } from "./letters";

const KINDS = ["weekly", "monthly"] as const;
const n = (count: number, one: string) => `${count.toLocaleString("en-US")} ${count === 1 ? one : `${one}s`}`;

function written(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

/** Paragraphs of a letter. A "Dear …," opening is its own line; the first body paragraph takes the drop cap. */
function LetterBody({ content }: { content: string }) {
  const paras = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const salutation = paras[0] && /^dear\b.{0,60}[,.:!]?$/i.test(paras[0]) ? paras[0] : null;
  const body = salutation ? paras.slice(1) : paras;
  return (
    <div className="mt-8 max-w-[38rem] text-prose">
      {salutation ? <p className="mb-5 font-display text-prompt">{salutation}</p> : null}
      <div className="space-y-5">
        {body.map((p, i) => (
          <p key={i} className={i === 0 ? "dropcap" : undefined}>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

function KindSwitch({ type }: { type: "weekly" | "monthly" }) {
  return (
    <nav aria-label="Kind of letter" className="flex gap-2.5">
      {KINDS.map((k) => (
        <Link key={k} href={`/digest/${k}`} aria-current={k === type ? "page" : undefined} className="chip">
          {k === "weekly" ? "Weekly" : "Monthly"}
        </Link>
      ))}
    </nav>
  );
}

export function DigestView({
  type,
  digests,
  initialId,
  next,
}: {
  type: "weekly" | "monthly";
  digests: DigestSummary[];
  initialId?: string;
  next?: NextLetter;
}) {
  const { name } = useCompanion();
  const monthly = type === "monthly";
  const start = digests.find((d) => d._id === initialId)?._id ?? digests[0]?._id ?? null;
  const [activeId, setActiveId] = useState(start);
  // Letters opened on this visit; the server still has them as unread until the next load.
  const [seen, setSeen] = useState<Set<string>>(() => new Set(start ? [start] : []));
  const index = Math.max(0, digests.findIndex((d) => d._id === activeId));
  const active = digests[index];
  const newer = index > 0 ? digests[index - 1] : null;
  const older = index < digests.length - 1 ? digests[index + 1] : null;

  useEffect(() => {
    if (active && !active.isRead) {
      void fetch(`/api/digests/${active._id}/read`, { method: "PATCH" }).catch(() => {});
    }
  }, [active]);

  function show(id: string, scroll = false) {
    setActiveId(id);
    setSeen((s) => new Set(s).add(id));
    // A letter has its own address, so reload and back keep it.
    const url = new URL(window.location.href);
    url.searchParams.set("letter", id);
    window.history.replaceState(window.history.state, "", url);
    if (scroll) document.getElementById("letter")?.scrollIntoView({ block: "start" });
  }

  const header = (
    <PageHeader
      kicker="Letters"
      title={monthly ? "Monthly letters" : "Weekly letters"}
      lede={
        monthly
          ? `On the first of each month, ${name} reads the month’s pages and writes you a letter.`
          : `Every Sunday, ${name} reads the week’s pages and writes back.`
      }
      actions={<KindSwitch type={type} />}
    />
  );

  if (!active) {
    return (
      <AppPage>
        {header}
        <div className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="relative rounded-lg border-2 border-dashed border-edge/50 px-[clamp(1.4rem,5vw,3.5rem)] py-[clamp(2.25rem,6vw,4rem)]">
            <span className="tape" aria-hidden />
            <p className="font-display text-display-s">No {monthly ? "monthly" : "weekly"} letter yet.</p>
            <p className="mt-4 max-w-[34rem] text-lede text-ink/75">
              {next
                ? next.ready
                  ? `Your first one arrives on ${next.when}. ${name} reads ${monthly ? "the month’s" : "the week’s"} pages and writes back.`
                  : `${name} writes ${monthly ? "on the first of the month" : "on Sundays"} about the pages before it. Write one before ${next.when}, and your first letter arrives that day.`
                : monthly
                  ? "The first arrives on the first of the month."
                  : "Your first one arrives on Sunday, once you’ve written a page that week."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {next && !next.ready ? (
                <Link href="/entry/new" className={buttonClass()}>
                  Write a page
                </Link>
              ) : null}
              <Link href={monthly ? "/digest/weekly" : "/digest/monthly"} className={buttonClass({ variant: "secondary" })}>
                {monthly ? "Weekly letters" : "Monthly letters"}
              </Link>
            </div>
          </div>
          <div aria-hidden className="mx-auto grid place-items-center max-lg:hidden">
            <div className="relative grid h-52 w-72 rotate-[-4deg] place-items-center rounded-lg border-2 border-edge bg-surface shadow-sticker">
              <svg viewBox="0 0 288 208" className="absolute inset-0 h-full w-full" fill="none">
                <path d="M16 12 144 116 272 12" stroke="var(--edge)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <Seal size={64} cut="surface" className="relative translate-y-6 rotate-[8deg]" />
            </div>
          </div>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage>
      {header}

      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <article
            id="letter"
            aria-labelledby="letter-title"
            className="card scroll-mt-24 px-[clamp(1.4rem,5vw,3.75rem)] pb-[clamp(2rem,5vw,3.25rem)] pt-[clamp(2.25rem,5vw,3.5rem)]"
          >
            <span className="tape" aria-hidden />
            <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p className="text-[0.9375rem] font-medium text-ink/70">{monthly ? "A letter for" : "A letter for the week of"}</p>
                <h2 id="letter-title" className="mt-1 font-display text-display-m">
                  {formatRange(active.periodStart, active.periodEnd, monthly)}
                </h2>
              </div>
              <p className="text-[0.9375rem] font-medium tabular-nums text-ink/70">
                {n(active.entryCount, "page")} · {n(active.wordCount, "word")}
              </p>
            </header>
            <div className="rule mt-6 border-t-2" />
            <div key={active._id} className="appear">
              <LetterBody content={active.content} />
            </div>
            <footer className="mt-10 flex flex-wrap items-center gap-4">
              <MaruMark size={60} title={name} className="-rotate-[8deg]" />
              <div>
                <p className="font-display text-display-s leading-none">{name}</p>
                <p className="mt-1.5 text-[0.875rem] text-ink/65">Written {written(active.createdAt)}</p>
              </div>
            </footer>
          </article>

          <nav aria-label="Next and previous letters" className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {newer ? (
              <button type="button" onClick={() => show(newer._id, true)} className={buttonClass({ variant: "secondary" })}>
                <Icon name="arrow-left" className="h-4 w-4" />
                Newer letter
              </button>
            ) : (
              <span />
            )}
            {older ? (
              <button type="button" onClick={() => show(older._id, true)} className={buttonClass({ variant: "secondary" })}>
                Older letter
                <Icon name="arrow" className="h-4 w-4" />
              </button>
            ) : null}
          </nav>
        </div>

        <aside aria-labelledby="letters-list" className="lg:sticky lg:top-8 lg:self-start">
          <h2 id="letters-list" className="font-display text-display-s">
            {digests.length > 1 ? "All letters" : "Letters"}
          </h2>
          <ul className="card mt-4 overflow-hidden">
            {digests.map((d, i) => {
              const on = d._id === active._id;
              const unread = !d.isRead && !seen.has(d._id);
              return (
                <li key={d._id} className={i ? "rule border-t-2" : undefined}>
                  <button
                    type="button"
                    onClick={() => show(d._id)}
                    aria-current={on ? "true" : undefined}
                    className={`flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-300 focus-visible:-outline-offset-4 ${
                      on ? "bg-sun text-on-sun" : "hover:bg-ink/[0.04]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[1.3rem] leading-tight">
                        {formatRange(d.periodStart, d.periodEnd, monthly)}
                      </span>
                      <span className={`text-[0.8125rem] font-medium ${on ? "" : "text-ink/65"}`}>{n(d.entryCount, "page")}</span>
                    </span>
                    {unread ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-semibold">
                        <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-edge bg-accent" />
                        New
                      </span>
                    ) : on ? (
                      <Icon name="letter" className="h-5 w-5 shrink-0" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {next ? (
            <p className="mt-5 flex items-start gap-3 rounded-lg border-2 border-dashed border-edge/50 px-4 py-3.5 text-[0.9375rem] text-ink/75">
              <Seal size={22} cut="ground" className="mt-0.5" />
              <span>
                Next letter: <span className="font-semibold text-ink">{next.when}</span>
                {next.ready ? null : <span className="block text-[0.8125rem] text-ink/65">Write a page before then and it’s yours.</span>}
              </span>
            </p>
          ) : null}
        </aside>
      </div>
    </AppPage>
  );
}
