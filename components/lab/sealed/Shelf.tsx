"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Envelope, EnvelopeMark } from "./Envelope";
import { SUNDAY, TODAY, addDays, countdown, longDate, monthShort, shortDate, type Capsule } from "./data";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "date", label: "Dates" },
  { id: "promise", label: "Promises" },
  { id: "person", label: "For people" },
  { id: "group", label: "Together" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const matches = (c: Capsule, f: Filter) =>
  f === "all" || c.kind === f || (f === "person" && c.kind === "kept") || (f === "group" && c.kind === "kept");

/** 24 months, starting next month. */
const MONTHS = Array.from({ length: 24 }, (_, i) => {
  const y = 2026 + Math.floor((10 + i) / 12);
  const m = ((10 + i) % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
});

export function Shelf({ capsules, offerOpened }: { capsules: Capsule[]; offerOpened: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [delay, setDelay] = useState<Record<string, number>>({});
  const [peeked, setPeeked] = useState<string | null>(null);

  const withDelay = capsules.map((c) => (delay[c.id] ? { ...c, opensOn: addDays(c.opensOn, delay[c.id]) } : c));
  const shown = withDelay.filter((c) => matches(c, filter));
  const stillSealed = withDelay.filter((c) => !(c.id === "offer" && offerOpened));
  const dated = stillSealed.filter((c) => c.kind !== "promise");
  const waiting = stillSealed.filter((c) => c.kind === "promise");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h2 className="font-display text-display-m">On the shelf</h2>
          <p className="mt-2 text-ink/70">
            {stillSealed.length} sealed. You can see when each one opens, never what’s inside, not even the ones you wrote.
          </p>
        </div>
        <div role="group" aria-label="Show" className="no-scrollbar -mx-margin flex max-w-[calc(100%+2*var(--spacing-margin))] gap-2 overflow-x-auto px-margin sm:mx-0 sm:max-w-none sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`h-11 shrink-0 rounded-full border px-4 text-[0.9375rem] transition-colors duration-300 ${ filter === f.id ? "border-ink/80 bg-ink/[0.06] text-ink" : "border-ink/15 text-ink/70 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section aria-labelledby="almanac-heading" className="mt-9">
        <h3 id="almanac-heading" className="text-[0.9375rem] text-ink/70">
          The next two years
        </h3>
        <div className="no-scrollbar -mx-margin mt-3 overflow-x-auto px-margin">
          <ol className="rule grid min-w-[60rem] grid-cols-[repeat(24,minmax(0,1fr))] border-y">
            {MONTHS.map((ym, i) => {
              const here = dated.filter((c) => c.opensOn.startsWith(ym));
              const jan = ym.endsWith("-01") || i === 0;
              return (
                <li key={ym} className={`rule relative flex h-[5.5rem] flex-col justify-between px-1.5 py-2 ${i ? "border-l" : ""}`}>
                  <span className="text-[0.8125rem] leading-tight text-ink/65">
                    {monthShort(`${ym}-01`)}
                    {jan ? <span className="block text-ink/65">{ym.slice(0, 4)}</span> : null}
                  </span>
                  <span className="flex flex-col gap-1">
                    {here.map((c) => (
                      <span key={c.id} title={`${c.label}: ${longDate(c.opensOn)}`} className={matches(c, filter) ? "text-ink" : "text-ink/25"}>
                        <EnvelopeMark />
                        <span className="sr-only">
                          {c.label}, opens {longDate(c.opensOn)}
                        </span>
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        {waiting.length ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-ink/65">
            <EnvelopeMark className="mt-[0.2rem] h-3.5 w-5" />
            <span>Waiting on a promise, so not on the calendar: {waiting.map((c) => `“${c.promise}”`).join(", ")}</span>
          </p>
        ) : null}
      </section>

      <ul aria-label="Sealed capsules" className="no-scrollbar relative -mx-margin mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-margin px-margin pb-2 sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-14 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {shown.map((c) => {
          const opened = c.id === "offer" && offerOpened;
          const expanded = openId === c.id;
          return (
            <li key={c.id} className="w-[84%] max-w-[22rem] shrink-0 snap-start sm:w-auto sm:max-w-none">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`capsule-${c.id}`}
                onClick={() => {
                  setOpenId(expanded ? null : c.id);
                  setPeeked(null);
                }}
                className="group block w-full rounded-xs text-left"
              >
                <span className="block transition-transform duration-500 ease-out group-hover:-translate-y-1">
                  <Envelope open={opened} drawn={opened} seal={opened ? null : <Seal size={40} cut="surface" className="-rotate-6" />}>
                    <span className="block truncate text-center font-display text-[1.3rem] leading-tight">{c.label}</span>
                    <span className="mt-0.5 block truncate text-center text-[0.8125rem] text-ink/65">
                      {c.to ? `For ${c.to}` : c.kind === "group" ? `${c.keepers?.length} keepers` : "For you"}
                      {c.byEmail ? " · by email" : ""}
                    </span>
                  </Envelope>
                </span>
                <span className="mt-5 block font-display text-[1.65rem] leading-tight">
                  {opened ? "Opened this Sunday" : c.kind === "promise" ? `Opens when: ${c.promise}` : countdown(c.opensOn).replace(/^opens/, "Opens")}
                </span>
                <span className="mt-1 block text-sm text-ink/65">
                  {opened
                    ? `Sealed ${shortDate(c.sealedOn)} · opened ${shortDate(SUNDAY)}`
                    : c.kind === "promise"
                      ? `or on ${shortDate(c.opensOn)}, whichever comes first`
                      : `${longDate(c.opensOn)} · sealed ${shortDate(c.sealedOn)}`}
                </span>
                <span className="sr-only">{expanded ? ", hide details" : ", show details"}</span>
              </button>

              {c.keepers ? (
                <p className="mt-3 flex flex-wrap items-center gap-1.5">
                  {c.keepers.map((k, i) => (
                    <PersonSeal key={i} initial={k.initial} size={26} state={k.inked ? "inked" : "blank"} title={`${k.name}${k.inked ? " has added" : " hasn’t added yet"}`} />
                  ))}
                </p>
              ) : null}

              <div id={`capsule-${c.id}`} hidden={!expanded} className="rule mt-4 border-t pt-4 text-[0.9375rem] text-ink/80">
                <p>{detail(c, opened)}</p>
                <p className="mt-2 text-ink/70">Inside: {c.contents}.</p>
                {!opened ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.kind === "date" || c.kind === "group" || c.kind === "promise" ? (
                      <Button variant="secondary" onClick={() => setDelay((d) => ({ ...d, [c.id]: (d[c.id] ?? 0) + 31 }))}>
                        Postpone a month
                      </Button>
                    ) : null}
                    <Button variant="quiet" onClick={() => setPeeked(c.id)}>
                      Reread it
                    </Button>
                  </div>
                ) : null}
                <p aria-live="polite" className="mt-3 text-ink/80">
                  {peeked === c.id ? `It stays shut until ${c.kind === "promise" ? "the promise is kept" : longDate(c.opensOn)}. That’s the point.` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {shown.length > 1 ? <p className="mt-3 text-sm text-ink/65 sm:hidden">Swipe for more · {shown.length} envelopes</p> : null}
      {shown.length === 0 ? <p className="mt-12 text-ink/65">Nothing sealed like this yet.</p> : null}
      <p className="mt-14 text-sm text-ink/65">Today is {longDate(TODAY)} in this demo, so every countdown reads the same.</p>
    </div>
  );
}

function detail(c: Capsule, opened: boolean) {
  if (opened) return `You kept the promise, and it opened with your letter on ${longDate(SUNDAY)}.`;
  const unsigned = c.keepers?.filter((k) => !k.inked).map((k) => k.name) ?? [];
  switch (c.kind) {
    case "promise":
      return `It opens the Sunday after you tick “${c.promise}”. If you never do, it opens on ${longDate(c.opensOn)} anyway.`;
    case "kept":
      return `${(c.keepers?.length ?? 1) - 1} others are keeping memories for ${c.to} too. You see their seals, never their pages, until she does.`;
    case "person":
      return c.byEmail
        ? `${c.to} isn’t on Kata, so it goes as a letter by email, with a backup address in case that one goes stale.`
        : `It arrives with ${c.to}’s Sunday letter, and only ${c.to} can open it.`;
    case "group":
      return unsigned.length
        ? `${unsigned.join(" and ")} ${unsigned.length === 1 ? "hasn’t" : "haven’t"} added a page yet. Everyone opens it the same morning.`
        : "Everyone has added a page. Everyone opens it the same morning.";
    default:
      return "It opens with that week’s Sunday letter. The night before, Kata asks if you still want it to.";
  }
}
