"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { person, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { DoubleMark, goToScreen, JointSeal, listNames } from "./bits";
import { EASE, FRIENDS, INVITE, NOT_YET, PASS_TITLE, TIMELINE, YEAR_LATE, type Friend, type Shared } from "./data";
import type { PassState } from "./PassScreen";

const T0 = Date.parse(TIMELINE.from);
const T1 = Date.parse(TIMELINE.to);
const at = (iso: string) => ((Date.parse(iso) - T0) / (T1 - T0)) * 100;

const FERRY: Shared = {
  id: "ferry",
  date: "2026-10-25",
  label: "Oct 25, 2026",
  title: PASS_TITLE,
  pens: 3,
  mine: "Forty minutes in the dark with the whole city lit up on one side.",
  theirs: "",
};

export function PeopleScreen({
  me,
  pass,
  alfamaOpen,
}: {
  me: Me;
  pass: PassState;
  alfamaOpen: boolean;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState("mira");
  const [phoneBook, setPhoneBook] = useState(false);
  const bookRef = useRef<HTMLElement>(null);

  // Live demo state from the other screens: the passed ferry, the night still sealed.
  const friends: Friend[] = FRIENDS.map((f) => {
    const extra = pass.passed && pass.people.includes(f.id) ? [FERRY] : [];
    return { ...f, kasane: [...f.kasane, ...extra] };
  });
  const passedOthers = pass.passed ? pass.people.filter((id) => !friends.some((f) => f.id === id)) : [];
  const isPending = (k: Shared) => (k.id === "ferry" ? true : k.id === "m5" ? !alfamaOpen : false);

  const waiting: { key: string; who: string[]; title: string; when: string }[] = [];
  if (!alfamaOpen) waiting.push({ key: "alfama", who: ["mira"], title: INVITE.title, when: `Both sides are in once you seal yours. Unfolds ${INVITE.unfoldsAt}.` });
  if (pass.passed && pass.people.length)
    waiting.push({ key: "ferry", who: pass.people, title: PASS_TITLE, when: "Your side is in. Unfolds when theirs are, or Sunday at 9pm." });

  const friend = friends.find((f) => f.id === open) ?? friends[0];

  function choose(id: string) {
    setOpen(id);
    setPhoneBook(true);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => {
        const el = bookRef.current;
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24 });
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-start">
      <div className={`lg:col-span-7 ${phoneBook ? "hidden lg:block" : ""}`}>
        <h2 className="font-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-none">Your people</h2>
        <p className="mt-3 max-w-xl text-ink/70">
          Listed by what you remember together, across the years. There’s nothing to follow and nothing to count.
        </p>

        {waiting.length ? (
          <section aria-labelledby="waiting-title" className="mt-9">
            <h3 id="waiting-title" className="text-[0.9375rem] text-ink/65">
              Still sealed
            </h3>
            <ul className="mt-3 space-y-2">
              {waiting.map((w) => (
                <li key={w.key} className="flex items-center gap-4 rounded-sm border border-dashed border-ink/25 px-4 py-3.5">
                  <span className="flex -space-x-1.5">
                    <PersonSeal initial={me.initial} size={28} state={w.key === "ferry" ? "inked" : "blank"} className="bg-ground" />
                    {w.who.map((id) => (
                      <PersonSeal key={id} initial={person(id).initial} size={28} state={w.key === "ferry" ? "blank" : "inked"} className="bg-ground" />
                    ))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[1.25rem] leading-tight">
                      {w.title}
                      <span className="text-ink/65"> · with {listNames(w.who.map((id) => person(id).first))}</span>
                    </p>
                    <p className="text-sm text-ink/65">{w.when}</p>
                  </div>
                  {w.key === "alfama" ? (
                    <button
                      type="button"
                      onClick={() => goToScreen("invite")}
                      aria-label={`Write your side of ${w.title}`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink/70 transition-colors duration-300 hover:bg-ink/[0.05] hover:text-ink"
                    >
                      <Icon name="pen" className="h-5 w-5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="by-memory-title" className="mt-9">
          <h3 id="by-memory-title" className="text-[0.9375rem] text-ink/65">
            By what you share
          </h3>
          <div aria-hidden className="mt-3 grid grid-cols-1 px-3 sm:grid-cols-[38px_minmax(0,1fr)_minmax(0,14rem)] sm:gap-x-4">
            <span className="hidden sm:block" />
            <span className="hidden sm:block" />
            <span className="relative block h-5 text-[0.8125rem] tabular-nums text-ink/65">
              {TIMELINE.years.map((y) => (
                <span key={y} className="absolute top-0" style={{ left: `${at(`${y}-01-01`)}%` }}>
                  {y}
                </span>
              ))}
            </span>
          </div>
          <ul className="rule mt-1.5 divide-y divide-ink/10 border-y">
            {friends.map((f) => {
              const p = person(f.id);
              const on = f.id === open;
              const done = f.kasane.filter((k) => !isPending(k)).length;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => choose(f.id)}
                    aria-current={on ? "true" : undefined}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-3 py-4 text-left transition-colors duration-300 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,14rem)] ${ on ? "lg:bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
                    }`}
                  >
                    <PersonSeal initial={p.initial} size={38} className={on ? "-rotate-6" : "rotate-0 transition-transform duration-500"} />
                    <span className="min-w-0">
                      <span className="block font-display text-[1.45rem] leading-tight">{p.first}</span>
                      <span className="block text-sm text-ink/65">
                        {done} Kasane · since {f.since}
                      </span>
                    </span>
                    <Icon name="arrow" className="h-4 w-4 text-ink/50 sm:hidden" />
                    <span className="col-span-3 sm:col-span-1">
                      <Timeline items={f.kasane} isPending={isPending} />
                    </span>
                  </button>
                </li>
              );
            })}
            {passedOthers.map((id) => (
              <li key={id} className="flex items-center gap-4 px-3 py-4">
                <PersonSeal initial={person(id).initial} size={38} state="blank" />
                <span>
                  <span className="block font-display text-[1.45rem] leading-tight">{person(id).first}</span>
                  <span className="block text-sm text-ink/65">Your first Kasane is waiting for their side</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="not-yet-title" className="mt-9">
          <h3 id="not-yet-title" className="text-[0.9375rem] text-ink/65">
            Connected, nothing shared yet
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            {NOT_YET.filter((id) => !passedOthers.includes(id)).map((id) => (
              <span key={id} className="inline-flex items-center gap-2.5">
                <PersonSeal initial={person(id).initial} size={30} state="resting" />
                <span className="text-ink/80">{person(id).first}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 max-w-lg text-sm text-ink/65">A Kasane starts from a page you wrote, never from a request.</p>
        </section>
      </div>

      {/* The Book of Us */}
      <section
        ref={bookRef}
        aria-labelledby="book-title"
        className={`lg:sticky lg:top-6 lg:col-span-5 ${phoneBook ? "" : "hidden lg:block"}`}
      >
        <button
          type="button"
          onClick={() => setPhoneBook(false)}
          className="-ml-2 mb-3 inline-flex h-11 items-center gap-2 rounded-md px-2 text-[0.9375rem] text-ink/70 hover:text-ink lg:hidden"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Your people
        </button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={friend.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <Book me={me} friend={friend} isPending={isPending} />
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function Book({ me, friend, isPending }: { me: Me; friend: Friend; isPending: (k: Shared) => boolean }) {
  const p = person(friend.id);
  const [offered, setOffered] = useState(false);
  const pair = me.first === "You" ? `${p.first} & you` : `${p.first} & ${me.first}`;
  const items = [...friend.kasane].sort((a, b) => b.date.localeCompare(a.date));
  const kept = friend.kasane.filter((k) => !isPending(k)).length;

  return (
    <div>
      <div className="chapter relative overflow-hidden rounded-xs px-7 pb-8 pt-7 shadow-paper">
        {/* The spine of the book. */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-3 bg-ink/[0.07]" />
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-ink/65">The Book of Us</p>
          <JointSeal a={p.initial} b={me.initial} size={34} />
        </div>
        <h2 id="book-title" className="mt-8 font-display text-[clamp(2.4rem,2rem+1.6vw,3.25rem)] leading-[0.95]">
          {pair}
        </h2>
        <p className="mt-3 text-ink/70">
          {kept} {kept === 1 ? "day" : "days"} remembered together · since {friend.since}
        </p>
      </div>

      {friend.id === YEAR_LATE.friend ? (
        <div className="mt-5 rounded-sm border border-ink/15 p-5">
          <p className="font-display text-[1.3rem] leading-tight">A page from a year ago</p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink/75">{YEAR_LATE.line}</p>
          <div className="mt-4" aria-live="polite">
            {offered ? (
              <p className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium">
                <Icon name="check" className="h-4 w-4" />
                Offered. {p.first} decides, and nothing moves until you both say yes.
              </p>
            ) : (
              <Button variant="secondary" onClick={() => setOffered(true)}>
                Offer to swap pages
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <ol className="mt-6 space-y-3">
        {items.map((k) => {
          const pending = isPending(k);
          return (
            <li key={k.id} className="sheet px-5 pb-5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink/65">
                    {k.label}
                    {k.pens > 2 ? ` · ${k.pens} pens` : ""}
                    {pending ? " · still sealed" : ""}
                  </p>
                  <h3 className="mt-0.5 font-display text-[1.35rem] leading-tight">{k.title}</h3>
                </div>
                <span className="mt-1">
                  <DoubleMark pens={k.pens} dashed={pending} />
                </span>
              </div>
              <div className="mt-3 space-y-2 text-[1.0625rem] leading-snug">
                <p className="flex gap-2.5">
                  <PersonSeal initial={me.initial} size={20} className="mt-0.5" title="You" />
                  <span>{k.mine}</span>
                </p>
                <p className="flex gap-2.5">
                  <PersonSeal initial={p.initial} size={20} state={pending ? "blank" : "inked"} className="mt-0.5" title={p.first} />
                  <span className={pending ? "text-ink/65" : ""}>{pending ? `${p.first}’s side opens when it unfolds.` : k.theirs}</span>
                </p>
              </div>
              {k.note ? <p className="mt-3 text-sm text-ink/65">{k.note}</p> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Timeline({ items, isPending }: { items: Shared[]; isPending: (k: Shared) => boolean }) {
  return (
    <span aria-hidden className="relative block h-7">
      <span className="absolute inset-x-0 top-1/2 h-px bg-ink/20" />
      {TIMELINE.years.slice(1).map((y) => (
        <span key={y} className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink/30" style={{ left: `${at(`${y}-01-01`)}%` }} />
      ))}
      {items.map((k) => (
        <span key={k.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${Math.min(97, Math.max(3, at(k.date)))}%` }}>
          <DoubleMark pens={k.pens} dashed={isPending(k)} />
        </span>
      ))}
    </span>
  );
}
