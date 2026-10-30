"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { person, type Me } from "@/components/lab/cast";
import { ASKS, INITIAL_LENDING, LEND_PEOPLE, LEND_TAGS, MONTHS, PAGES, PAGE_COUNTS, TENDER, type Ask, type Lending } from "./data";
import { EASE, Sprig } from "./Pressed";

type AskState = { status: "waiting" | "editing" | "sent" | "declined"; text: string };

const YEARS = ["2024", "2025", "2026"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function lendsAny(l: Lending) {
  return l.months.length + l.tags.length > 0;
}

function summary(l: Lending) {
  const pages = l.months.reduce((n, key) => {
    const [y, m] = key.split("-");
    return n + (PAGE_COUNTS[y]?.[Number(m)] ?? 0);
  }, 0);
  return { months: l.months.length, pages };
}

export function LendScreen({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [lending, setLending] = useState(INITIAL_LENDING);
  const [who, setWho] = useState("priya");
  const [year, setYear] = useState("2024");
  const [current, setCurrent] = useState(ASKS[0].id);
  const [asks, setAsks] = useState<Record<string, AskState>>(() =>
    Object.fromEntries(ASKS.map((a) => [a.id, { status: "waiting", text: a.draft }]))
  );

  const p = person(who);
  const mine = lending[who];
  const sum = summary(mine);
  const active = ASKS.find((a) => a.id === current)!;
  const state = asks[active.id];
  const waiting = ASKS.filter((a) => asks[a.id].status === "waiting" || asks[a.id].status === "editing").length;

  function toggleMonth(key: string) {
    setLending((l) => {
      const cur = l[who];
      const months = cur.months.includes(key) ? cur.months.filter((m) => m !== key) : [...cur.months, key];
      return { ...l, [who]: { ...cur, months } };
    });
  }
  function toggleTag(tag: string) {
    setLending((l) => {
      const cur = l[who];
      const tags = cur.tags.includes(tag) ? cur.tags.filter((t) => t !== tag) : [...cur.tags, tag];
      return { ...l, [who]: { ...cur, tags } };
    });
  }
  function setAsk(id: string, patch: Partial<AskState>) {
    setAsks((a) => ({ ...a, [id]: { ...a[id], ...patch } }));
  }

  return (
    <div className="grid grid-cols-1 gap-x-14 gap-y-16 lg:grid-cols-2">
      {/* What you lend, and to whom. */}
      <section aria-labelledby="pf-lend-title">
        <h2 id="pf-lend-title" className="font-display text-display-m">
          Who may ask
        </h2>
        <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink/70">
          Choose who can ask, and which months they can ask about. They never see the pages, only answers you approve.
        </p>

        <div role="group" aria-label="Lend to" className="mt-7 grid grid-cols-5 gap-1.5">
          {LEND_PEOPLE.map((id) => {
            const q = person(id);
            const on = id === who;
            const lends = lendsAny(lending[id]);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setWho(id)}
                className={`flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-md border px-1 py-2 transition-colors duration-300 ${ on ? "border-ink/60 bg-ink/[0.05]" : "border-transparent hover:border-ink/20"
                }`}
              >
                <PersonSeal initial={q.initial} size={34} state={lends ? "inked" : "blank"} />
                <span className="text-[0.875rem] leading-none">{q.first}</span>
                <span className="sr-only">{lends ? ", lending" : ", not lending"}</span>
              </button>
            );
          })}
        </div>

        <div className="rule mt-6 border-t pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-[1.6rem] leading-tight">What {p.first} can ask about</h3>
            <div role="group" aria-label="Year" className="inline-flex rounded-md border border-ink/15 p-1">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  aria-pressed={y === year}
                  onClick={() => setYear(y)}
                  className={`h-11 rounded-sm px-3.5 text-[0.9375rem] tabular-nums transition-colors duration-300 ${ y === year ? "bg-ink text-ground" : "text-ink/70 hover:text-ink"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div role="group" aria-label={`Months of ${year}`} className="mt-5 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {MONTHS.map((m, i) => {
              const key = `${year}-${i}`;
              const count = PAGE_COUNTS[year][i];
              const tender = TENDER[year]?.includes(i);
              const empty = count === 0;
              const on = mine.months.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  disabled={tender || empty}
                  onClick={() => toggleMonth(key)}
                  aria-label={`${MONTH_NAMES[i]} ${year}, ${tender ? "tender, never lent" : empty ? "no pages yet" : `${count} pages`}`}
                  className={`flex min-h-14 flex-col items-start justify-center rounded-sm border px-2.5 py-1.5 text-left transition-colors duration-300 ${ on ? "border-ink bg-ink text-ground"
                      : tender
                        ? "border-dashed border-ink/25 text-ink/65"
                        : empty
                          ? "border-ink/10 text-ink/65 opacity-60"
                          : "border-ink/15 hover:border-ink/40"
                  }`}
                >
                  <span className="text-[0.9375rem] leading-tight">{m}</span>
                  <span className={`text-[0.8125rem] leading-tight ${on ? "text-ground/80" : "text-ink/65"}`}>
                    {tender ? "tender" : empty ? "to come" : `${count} pages`}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-[0.9375rem] text-ink/70">And pages tagged</p>
          <div role="group" aria-label="Tags" className="mt-2 flex flex-wrap gap-1.5">
            {LEND_TAGS.map((t) => {
              const on = mine.tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(t)}
                  className={`h-11 rounded-full border px-4 text-[0.9375rem] transition-colors duration-300 ${ on ? "border-ink bg-ink text-ground" : "border-ink/15 text-ink/75 hover:border-ink/40"
                  }`}
                >
                  #{t}
                </button>
              );
            })}
          </div>

          <div className="mt-7 rounded-xs bg-raised/60 p-5">
            {sum.months || mine.tags.length ? (
              <>
                <p className="text-[1.0625rem] leading-relaxed">
                  {p.first} can ask about {sum.months ? `${sum.months} ${sum.months === 1 ? "month" : "months"}` : "no months"}
                  {mine.tags.length ? ` and pages tagged ${mine.tags.map((t) => `#${t}`).join(" ")}` : ""}
                  {sum.pages ? `, ${sum.pages} pages in all` : ""}. Every answer waits for you.
                </p>
                <Button
                  variant="quiet"
                  className="-ml-3 mt-2"
                  onClick={() => setLending((l) => ({ ...l, [who]: { months: [], tags: [] } }))}
                >
                  Stop lending to {p.first}
                </Button>
              </>
            ) : (
              <p className="text-[1.0625rem] leading-relaxed text-ink/75">
                Nothing lent to {p.first}. Choose a month or a tag and they can start asking.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Questions that came in, Kata's drafts, and what the asker receives. */}
      <section aria-labelledby="pf-inbox-title">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="pf-inbox-title" className="font-display text-display-m">
            Asked of you
          </h2>
          <p className="text-sm text-ink/65" aria-live="polite">
            {waiting ? `${waiting} waiting` : "All answered"}
          </p>
        </div>

        <ul className="rule mt-6 divide-y divide-ink/10 border-y">
          {ASKS.map((a) => {
            const q = person(a.from);
            const on = a.id === current;
            const s = asks[a.id].status;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCurrent(a.id)}
                  className={`flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-300 ${ on ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
                  }`}
                >
                  <PersonSeal initial={q.initial} size={32} state={s === "sent" ? "resting" : "inked"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-medium leading-tight">{q.first}</span>
                    <span className="block truncate text-sm text-ink/65">{a.question}</span>
                  </span>
                  <span className="shrink-0 text-sm text-ink/65">
                    {s === "sent" ? "Sent" : s === "declined" ? "Declined" : a.asked.split(",")[0]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id + state.status.replace("editing", "waiting") + (lendsAny(lending[active.from]) ? "" : "-unlent")}
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mt-8"
          >
            {!lendsAny(lending[active.from]) && state.status !== "sent" ? (
              <div className="rounded-xs border border-dashed border-ink/25 p-6">
                <p className="font-display text-[1.5rem] leading-tight">No pages to answer from.</p>
                <p className="mt-2 text-[0.9375rem] text-ink/70">
                  You stopped lending to {person(active.from).first}, so Kata threw its draft away. Lend a month or a tag again and it will draft a new one from those pages only.
                </p>
                <Button variant="quiet" className="-ml-3 mt-3" onClick={() => setLending((l) => ({ ...l, [active.from]: INITIAL_LENDING[active.from] }))}>
                  Lend the same pages again
                </Button>
              </div>
            ) : state.status === "sent" ? (
              <Keepsake ask={active} text={state.text} me={me} onUnsend={() => setAsk(active.id, { status: "waiting" })} />
            ) : state.status === "declined" ? (
              <div className="rounded-xs border border-dashed border-ink/25 p-6">
                <p className="font-display text-[1.5rem] leading-tight">Declined, kindly.</p>
                <p className="mt-2 text-[0.9375rem] text-ink/70">
                  {person(active.from).first} sees: “{me.first} {active.declineNote}” Nothing from your pages goes with it.
                </p>
                <Button variant="quiet" className="-ml-3 mt-3" onClick={() => setAsk(active.id, { status: "waiting" })}>
                  Undo
                </Button>
              </div>
            ) : (
              <Draft
                ask={active}
                state={state}
                onEdit={() => setAsk(active.id, { status: "editing" })}
                onText={(text) => setAsk(active.id, { text })}
                onDone={() => setAsk(active.id, { status: "waiting" })}
                onApprove={() => setAsk(active.id, { status: "sent" })}
                onDecline={() => setAsk(active.id, { status: "declined" })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function Draft({
  ask,
  state,
  onEdit,
  onText,
  onDone,
  onApprove,
  onDecline,
}: {
  ask: Ask;
  state: AskState;
  onEdit: () => void;
  onText: (t: string) => void;
  onDone: () => void;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const q = person(ask.from);
  const editing = state.status === "editing";
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <div className="flex gap-4">
        <PersonSeal initial={q.initial} size={40} className="-rotate-3" />
        <div className="min-w-0">
          <p className="text-sm text-ink/65">
            {q.first} asked your lent pages · {ask.asked}
          </p>
          <p className="mt-1.5 font-display text-prompt ">“{ask.question}”</p>
        </div>
      </div>

      <div className="sheet mt-6 p-[clamp(1.25rem,4vw,2rem)]">
        <p className="text-sm text-ink/65">Kata’s draft in your words, from {ask.span} only</p>
        {editing ? (
          <>
            <label htmlFor={`pf-draft-${ask.id}`} className="sr-only">
              Your answer to {q.first}
            </label>
            <textarea
              id={`pf-draft-${ask.id}`}
              value={state.text}
              onChange={(e) => onText(e.target.value)}
              rows={7}
              autoFocus
              onFocus={(e) => {
                const end = e.currentTarget.value.length;
                e.currentTarget.setSelectionRange(end, end);
              }}
              className="control mt-3 text-[1.0625rem] leading-relaxed"
            />
          </>
        ) : (
          <p className="mt-3 text-prose">{state.text}</p>
        )}
        <div className="rule mt-5 border-t pt-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm text-ink/65">Drawn from</span>
            {ask.cites.map((id) => {
              const on = open === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-expanded={on}
                  aria-controls={`pf-src-${ask.id}`}
                  onClick={() => setOpen(on ? null : id)}
                  className={`inline-flex h-11 items-center rounded-sm px-2 text-[0.875rem] underline decoration-ink/25 underline-offset-4 transition-colors duration-300 ${ on ? "bg-ink/[0.07] text-ink" : "text-ink/75 hover:text-ink"
                  }`}
                >
                  {PAGES[id].date}
                </button>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.blockquote
                key={open}
                id={`pf-src-${ask.id}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="rule mt-2 border-l-2 pl-4">
                  <p className="text-sm text-ink/65">
                    {PAGES[open].weekday}, {PAGES[open].date} · {PAGES[open].prompt}
                  </p>
                  <p className="mt-1 text-[1.0625rem] leading-relaxed text-ink/85">{PAGES[open].text}</p>
                  <p className="mt-1 text-sm text-ink/65">Only you see this page. {person(ask.from).first} doesn’t.</p>
                </div>
              </motion.blockquote>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={onApprove} disabled={!state.text.trim()}>
          Approve and send
        </Button>
        {editing ? (
          <Button variant="secondary" onClick={onDone}>
            <Icon name="check" className="h-4 w-4" />
            Done editing
          </Button>
        ) : (
          <Button variant="secondary" onClick={onEdit}>
            <Icon name="pen" className="h-4 w-4" />
            Edit
          </Button>
        )}
        <Button variant="quiet" onClick={onDecline}>
          Decline
        </Button>
      </div>
      <p className="mt-3 text-sm text-ink/65">{q.first} sees only what you send. Never the pages.</p>
    </div>
  );
}

function Keepsake({ ask, text, me, onUnsend }: { ask: Ask; text: string; me: Me; onUnsend: () => void }) {
  const q = person(ask.from);
  return (
    <div>
      <p className="flex items-center gap-2 text-[0.9375rem] text-ink">
        <Icon name="check" className="h-4 w-4" />
        Sent to {q.first}. This is what arrives.
      </p>
      <article
        aria-label={`Keepsake card for ${q.first}`}
        className="chapter relative mt-5 overflow-hidden rounded-xs p-[clamp(1.4rem,4.5vw,2.5rem)] shadow-paper"
      >
        <Sprig className="pointer-events-none absolute -bottom-2 right-2 h-20 w-14 -rotate-[24deg] text-ink/70" />
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink/65">A keepsake from {me.first}’s pages</p>
            <p className="mt-2 font-display text-prompt ">“{ask.question}”</p>
          </div>
          <PersonSeal initial={me.initial} size={44} className="-rotate-6" title={`Approved by ${me.first}`} />
        </header>
        <p className="mt-6 whitespace-pre-wrap text-prose text-ink/90">{text}</p>
        <footer className="rule mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t pt-4 text-sm text-ink/65">
          <span>From {ask.cites.length} {ask.cites.length === 1 ? "page" : "pages"} · {ask.span.split(" · ")[0]}</span>
          <span className="pr-10">Read by {me.first} before it was sent</span>
        </footer>
      </article>
      <Button variant="quiet" className="-ml-3 mt-3" onClick={onUnsend}>
        Take it back
      </Button>
    </div>
  );
}
