"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { EASE, toneClass } from "./bits";
import { EDITION, MIRA, bookById, type Book, type Leaf } from "./data";
import type { ShelfActions, ShelfState } from "./ShelfPrototype";

/** Books with a leaf that arrived since you last opened them. */
const NEW_LEAF = ["arjun"];
const WIDTH = ["w-[62%]", "w-[76%]", "w-[90%]"];

type Pick = { kind: "book"; id: string } | { kind: "slot"; index: number } | null;

export function ShelfScreen({ state, actions }: { state: ShelfState; actions: ShelfActions }) {
  const reduce = useReducedMotion();
  const [pick, setPick] = useState<Pick>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const filled = state.slots.filter(Boolean).length;
  const shelfRef = useRef<HTMLDivElement>(null);
  // Every screen stays mounted behind its tab, so a book placed from the Sunday letter
  // waits, unseen, and only drops onto the plank once the shelf is actually on screen.
  const [landed, setLanded] = useState<string | null>(null);
  useEffect(() => {
    const el = shelfRef.current;
    if (!el || !state.arrived || landed === state.arrived) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setLanded(state.arrived);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [state.arrived, landed]);

  useEffect(() => {
    if (!moved.current || !pick) return;
    moved.current = false;
    panel.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [pick, reduce]);

  function choose(p: Pick) {
    moved.current = true;
    setNotice(null);
    setPick(p);
    if (p?.kind === "book") actions.open(p.id);
  }

  const book = pick?.kind === "book" ? bookById(pick.id) : null;
  const onShelf = book ? state.slots.includes(book.id) : false;
  const lastDown = state.takenDown.find((id) => !state.slots.includes(id));
  const arrivedOver = state.arrived ? state.takenDown.find((id) => id !== state.arrived && !state.slots.includes(id)) : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-xl">
          <h2 className="font-display text-display-m">Your shelf</h2>
          <p className="mt-2 text-ink/70">
            Thirty spines, and no more. New leaves wait here and arrive together in Sunday’s letter. Nothing on this shelf refreshes.
          </p>
        </div>
        <p className="text-[0.9375rem] text-ink/70" aria-live="polite">
          {filled === 30 ? "30 of 30 · full" : `${filled} of 30 · room for ${30 - filled === 1 ? "one" : 30 - filled}`}
        </p>
      </div>

      <div ref={shelfRef} className="mt-8 grid grid-cols-6 gap-y-7 sm:grid-cols-10 lg:grid-cols-15" role="list" aria-label="Books on your shelf">
        {state.slots.map((id, i) => {
          const b = id ? bookById(id) : null;
          const selected = b ? pick?.kind === "book" && pick.id === b.id : pick?.kind === "slot" && pick.index === i;
          const fresh = b ? NEW_LEAF.includes(b.id) && !state.opened.includes(b.id) : false;
          return (
            <div key={i} role="listitem" className="relative">
              <button
                type="button"
                aria-expanded={selected}
                aria-controls="book-view"
                aria-label={
                  b
                    ? `${b.title}, by ${b.pen}${fresh ? ", new leaf" : ""}${b.resting ? `, resting since ${b.lastLeaf.replace("in ", "")}` : ""}`
                    : "Empty space on the shelf"
                }
                onClick={() => choose(selected ? null : b ? { kind: "book", id: b.id } : { kind: "slot", index: i })}
                className="group relative flex h-[11.5rem] w-full items-end justify-center pb-1.5 sm:h-[12.5rem] lg:h-[13.5rem]"
              >
                {b ? (
                  <motion.span
                    key={state.arrived === b.id ? `${b.id}-${landed === b.id ? "in" : "waiting"}` : b.id}
                    initial={state.arrived === b.id && !reduce ? { opacity: 0, y: -36 } : false}
                    animate={state.arrived === b.id && landed !== b.id && !reduce ? { opacity: 0, y: -36 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 1.1, delay: state.arrived === b.id ? 0.25 : 0, ease: EASE }}
                    className={`relative flex h-full ${WIDTH[b.width]} items-end`}
                  >
                    <span
                      style={{ height: `${b.height * 100}%` }}
                      className={`relative flex w-full flex-col items-center justify-between rounded-t-[3px] rounded-b-[2px] px-0.5 pb-2.5 pt-3 text-ink transition-transform duration-500 ease-out ${toneClass(b.tone)} ${ selected ? "-translate-y-3" : "group-hover:-translate-y-1"
                      } ${b.resting ? "opacity-80" : ""}`}
                    >
                      <Bands />
                      {fresh ? (
                        <span aria-hidden className="mb-1.5 h-2 w-2 shrink-0 rounded-[2px] bg-accent" />
                      ) : state.arrived === b.id ? (
                        <span aria-hidden className="mb-1.5 h-0.5 w-4 shrink-0 rounded-full bg-ink/50" />
                      ) : null}
                      <span className="min-h-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-display text-[0.9375rem] leading-none text-ink/85 [writing-mode:vertical-rl] [text-orientation:sideways] lg:text-base">
                        {b.title}
                      </span>
                      <PersonSeal initial={b.initial} size={20} state={b.resting ? "resting" : "inked"} className="mt-2" />
                    </span>
                  </motion.span>
                ) : (
                  <span
                    className={`flex h-[70%] w-[76%] items-center justify-center rounded-[3px] border-[1.5px] border-dashed transition-colors duration-300 ${ selected ? "border-ink/60" : "border-ink/25 group-hover:border-ink/45"
                    }`}
                  >
                    <span className="whitespace-nowrap font-display text-[0.9375rem] text-ink/65 [writing-mode:vertical-rl] [text-orientation:sideways]">Room for one</span>
                  </span>
                )}
              </button>
              {/* The plank */}
              <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-[color-mix(in_oklab,var(--ink)_16%,var(--raised))]" />
            </div>
          );
        })}
      </div>

      <div ref={panel} id="book-view" className="mt-10 scroll-mt-24" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {book ? (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <BookView
                book={book}
                onShelf={onShelf}
                notice={notice}
                onClose={() => setPick(null)}
                onTakeDown={() => {
                  actions.takeDown(book.id);
                  setNotice(`${book.pen} is off your shelf. Their leaves stop arriving, and nothing is sent to them.`);
                }}
                onPutBack={() => {
                  actions.place(book.id);
                  setNotice(null);
                }}
                full={filled === 30}
              />
            </motion.div>
          ) : pick?.kind === "slot" ? (
            <motion.div
              key="slot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="rounded-xs border border-dashed border-ink/25 p-[clamp(1.25rem,4vw,2.25rem)]"
            >
              <h3 className="font-display text-[1.9rem] leading-tight">Room for one</h3>
              <p className="mt-2 max-w-xl text-ink/70">
                You can place someone from their colophon or a form in the gallery. Or wait: some Sundays, Kata ends the letter with a P.S. about someone whose leaves rhyme with yours.
              </p>
              {lastDown ? (
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => {
                    actions.place(lastDown, pick.index);
                    choose({ kind: "book", id: lastDown });
                  }}
                >
                  Put {bookById(lastDown).title} back
                </Button>
              ) : null}
            </motion.div>
          ) : state.arrived === MIRA.id && state.slots.includes(MIRA.id) ? (
            <motion.p
              key={`arrived-${state.arrived}`}
              role="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.4, delay: reduce ? 0 : 1.1, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="max-w-2xl text-[0.9375rem] text-ink/70"
            >
              <span className="font-display text-[1.2rem] text-ink">{bookById(state.arrived).title}</span> is up
              {arrivedOver ? <>, where {bookById(arrivedOver).title} stood</> : null}. Its leaves start in next Sunday’s letter. Open it to read what’s
              already there.
            </motion.p>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-center gap-3 text-[0.9375rem] text-ink/65"
            >
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px] bg-accent" />
              Open a spine to read someone’s book in their order. The marked one has a leaf you haven’t read.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BookView({
  book,
  onShelf,
  full,
  notice,
  onClose,
  onTakeDown,
  onPutBack,
}: {
  book: Book;
  onShelf: boolean;
  full: boolean;
  notice: string | null;
  onClose: () => void;
  onTakeDown: () => void;
  onPutBack: () => void;
}) {
  return (
    <article aria-labelledby="book-title" className="sheet grid grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      {/* Title page */}
      <div className={`${book.tone === "night" ? "chapter" : "bg-raised"} flex flex-col p-[clamp(1.25rem,4vw,2.25rem)]`}>
        <div className="flex items-start justify-between gap-3">
          <PersonSeal initial={book.initial} size={52} state={book.resting ? "resting" : "inked"} className="-rotate-3" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the book"
            className="-mr-2 -mt-2 grid h-11 w-11 place-items-center rounded-md text-ink/65 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <h3 id="book-title" className="mt-6 font-display text-[clamp(1.9rem,1.6rem+1vw,2.4rem)] leading-[1.02]">
          {book.title}
        </h3>
        <p className="mt-1 text-[0.9375rem] text-ink/70">by {book.pen}</p>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink/85">{book.note}</p>
        <p className="mt-4 text-sm text-ink/65">
          Writes in “{book.form}” · {book.resting ? `resting since ${book.lastLeaf.replace("in ", "")}` : `last leaf ${book.lastLeaf}`}
        </p>
        <div className="mt-auto pt-7">
          {onShelf ? (
            <Button variant="secondary" onClick={onTakeDown}>
              Take down from shelf
            </Button>
          ) : (
            <Button variant="secondary" onClick={onPutBack} disabled={full}>
              {full ? "Shelf is full" : "Put it back"}
            </Button>
          )}
          {notice ? (
            <p role="status" className="mt-3 text-sm text-ink/70">
              {notice}
            </p>
          ) : null}
        </div>
      </div>

      {/* Leaves, in the author's order */}
      <div className="p-[clamp(1.25rem,4vw,2.5rem)]">
        <p className="text-sm text-ink/65">{book.leaves.length} leaves, newest first, as {book.pen.split(/[ ,]/)[0]} ordered them</p>
        <ol className="rule mt-4 divide-y divide-ink/10 border-t">
          {book.leaves.map((l) => (
            <li key={l.id} className="py-6">
              <p className="text-sm text-ink/65">
                {l.date}
                {l.fresh ? <span className="text-ink"> · {freshLabel(book, l)}</span> : null}
              </p>
              <h4 className="mt-1 font-display text-[1.6rem] leading-[1.05]">{l.title}</h4>
              <p className="mt-2 max-w-[38rem] text-prose text-ink/85">{l.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function freshLabel(book: Book, leaf: Leaf) {
  if (book.id === EDITION.kindred.bookId) return "quoted in Kata’s P.S.";
  if (EDITION.leaves.some((e) => e.leafId === leaf.id)) return "was in Sunday’s Edition";
  return "new · it comes in this Sunday’s Edition";
}

/** A spine's headband and tailband: two hairlines that make a rectangle read as a bound book. */
function Bands() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-x-[18%] top-1.5 h-px bg-current opacity-25" />
      <span aria-hidden className="pointer-events-none absolute inset-x-[18%] bottom-1 h-px bg-current opacity-25" />
    </>
  );
}
