"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Fragment, useState, type ReactNode } from "react";
import { CAST, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { Byline, EASE, MiniSpine, goToScreen } from "./bits";
import { EDITION, MIRA, MY_COLOPHON, bookById } from "./data";
import type { ShelfActions, ShelfState } from "./ShelfPrototype";

export function EditionScreen({ me, state, actions }: { me: Me; state: ShelfState; actions: ShelfActions }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <article aria-label="The end of your Sunday letter" className="sheet px-[clamp(1.15rem,5vw,3.75rem)] py-[clamp(1.75rem,5vw,3.5rem)]">
        <header className="rule flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-5">
          <p className="font-display text-[clamp(1.6rem,1.35rem+1vw,2.2rem)] leading-none">{EDITION.date}</p>
          <p className="text-sm text-ink/65">For {me.first} · the last page of your letter</p>
        </header>
        <p className="mt-6 max-w-[38rem] text-prose text-ink/80">
          <span className="text-ink/65">…</span> {EDITION.letterTail}
        </p>

        <section aria-labelledby="edition-title" className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 id="edition-title" className="font-display text-display-m">
              The Sunday Edition
            </h2>
          </div>
          <p className="mt-2 text-[0.9375rem] text-ink/65">Three leaves from your shelf this week. Never more than five.</p>

          <div className="rule mt-6 border-l-2 pl-5">
            <p className="text-sm text-ink/65">Editor’s note</p>
            <p className="mt-1 max-w-[36rem] text-[1.1875rem] leading-relaxed text-ink/85">{EDITION.editorsNote}</p>
          </div>

          <ol className="mt-8 space-y-4">
            {EDITION.leaves.map((e) => (
              <EditionLeaf key={e.leafId} bookId={e.bookId} leafId={e.leafId} onSend={() => actions.pressSeal(e.bookId)} />
            ))}
          </ol>
        </section>

        <footer className="mt-12 flex items-end justify-between gap-4">
          <p className="font-display text-[1.75rem] leading-none">— Kata</p>
          <Seal size={52} cut="surface" className="-rotate-6" />
        </footer>

        <Postscript state={state} actions={actions} />
      </article>

      <SealBook state={state} />
    </div>
  );
}

function EditionLeaf({ bookId, leafId, onSend }: { bookId: string; leafId: string; onSend: () => void }) {
  const book = bookById(bookId);
  const leaf = book.leaves.find((l) => l.id === leafId)!;
  const first = book.pen.split(" ")[0];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const id = `margin-${leafId}`;

  return (
    <li className="rounded-xs bg-ink/[0.035] p-[clamp(1.1rem,3.5vw,1.75rem)]">
      <Byline book={book} date={leaf.date} />
      <h3 className="mt-4 font-display text-[clamp(1.5rem,1.3rem+0.8vw,1.9rem)] leading-[1.05]">{leaf.title}</h3>
      <p className="mt-2 max-w-[38rem] text-prose text-ink/85">{leaf.body}</p>

      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="rule mt-5 border-t pt-4"
            role="status"
          >
            <p className="text-sm text-ink/65">In {first}’s margin</p>
            <p className="mt-1 text-[1.0625rem] text-ink/85">“{sent}”</p>
            <p className="mt-3 flex items-center gap-3 text-sm text-ink/70">
              <motion.span
                aria-hidden
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: -16 }}
                animate={{ opacity: 1, scale: 1, rotate: -6 }}
                transition={{ duration: 0.55, delay: reduce ? 0 : 0.2, ease: EASE }}
                className="inline-block"
              >
                <PersonSeal initial={book.initial} size={30} />
              </motion.span>
              <span>
                {first}’s seal is pressed into your seal book. Only {first} reads the note.
              </span>
            </p>
          </motion.div>
        ) : open ? (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="rule mt-5 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              setSent(draft.trim());
              onSend();
            }}
          >
            <label htmlFor={id} className="text-[0.9375rem] font-medium">
              A note in {first}’s margin
            </label>
            <textarea
              id={id}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={280}
              autoFocus
              placeholder="What it made you think of…"
              className="control mt-2 resize-none text-[1.0625rem]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink/65">Only {first} reads it. No replies, no counts.</p>
              <div className="flex gap-2">
                <Button variant="quiet" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="secondary" type="submit" disabled={!draft.trim()}>
                  Send the note
                </Button>
              </div>
            </div>
          </motion.form>
        ) : (
          <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-4">
            <Button variant="quiet" className="-ml-3" onClick={() => setOpen(true)}>
              <Icon name="pen" className="h-4 w-4" />
              Write in the margin
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

type PsStage = "folded" | "open" | "choosing" | "placed" | "declined";

function Postscript({ state, actions }: { state: ShelfState; actions: ShelfActions }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<PsStage>("folded");
  const [showBook, setShowBook] = useState(false);
  const [replaced, setReplaced] = useState<string | null>(null);
  // The first unfolding is slow; coming back to the choice later isn't.
  const [seen, setSeen] = useState(false);
  const { kindred } = EDITION;
  const onShelf = state.slots.includes(MIRA.id);
  const candidates = state.slots.filter((id): id is string => !!id && bookById(id).resting === true);
  const fallback = state.slots.filter((id): id is string => !!id && !candidates.includes(id)).slice(-2);
  const options = candidates.length ? candidates : fallback;

  function place() {
    if (state.slots.includes(null)) {
      actions.place(MIRA.id);
      setReplaced(null);
      setStage("placed");
    } else setStage("choosing");
  }

  function swap(id: string) {
    actions.place(MIRA.id, state.slots.indexOf(id));
    setReplaced(bookById(id).title);
    setStage("placed");
  }

  if (stage === "folded") {
    return (
      <div className="mt-12">
        <button
          type="button"
          onClick={() => setStage("open")}
          className="group relative flex min-h-24 w-full items-center justify-between gap-4 rounded-xs bg-raised px-[clamp(1.1rem,3.5vw,1.75rem)] py-5 text-left shadow-paper transition-transform duration-500 ease-out hover:-translate-y-0.5"
        >
          <span>
            <span className="block font-display text-[2.4rem] leading-none">P.S.</span>
            <span className="mt-1.5 block text-[0.9375rem] text-ink/70">Kata folded a short note in at the end. Unfold it.</span>
          </span>
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/20 transition-transform duration-500 ease-out group-hover:translate-y-0.5">
            <Icon name="arrow-down" className="h-4 w-4" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-12 [perspective:1100px]">
      <motion.section
        aria-labelledby="ps-title"
        initial={reduce ? { opacity: 0 } : { opacity: 0, rotateX: -64, y: -12 }}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 1.1, ease: EASE }}
        style={{ transformOrigin: "50% 0%" }}
        className="rounded-xs bg-raised px-[clamp(1.1rem,3.5vw,2rem)] pb-7 pt-6 shadow-paper"
      >
        <h2 id="ps-title" className="font-display text-[clamp(1.9rem,1.5rem+1.4vw,2.6rem)] leading-[1.05]">
          <span className="">P.S.</span> I think you’d like Mira.
        </h2>
        <p className="mt-3 max-w-[36rem] text-[1.125rem] leading-relaxed text-ink/85">
          She keeps a book called <em>Small Brave Things</em>, from Lisbon. Read these two lines side by side.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Quote delay={0.55} rhyme={kindred.rhyme} reduce={!!reduce} seal={<PersonSeal initial={MIRA.initial} size={28} />} who="Mira" when={`${kindred.theirs.date}, in her book`} text={kindred.theirs.text} />
          <Quote
            delay={1.15}
            reduce={!!reduce}
            seal={<PersonSeal initial="E" size={28} />}
            who={`You, as ${MY_COLOPHON.pen}`}
            when={`${kindred.yours.date}, in “${kindred.yours.leaf}”`}
            text={kindred.yours.text}
            rhyme={kindred.rhyme}
            mine
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 2.6, ease: EASE }}
          className="mt-5 max-w-[36rem] text-[1.125rem] leading-relaxed text-ink/85"
        >
          Two days apart, two cities apart, and you both reached for the same word. She’s been doing the braver things one at a time. I only read published leaves to notice this, and you both said yes to introductions.
        </motion.p>

        <AnimatePresence mode="wait" initial={false}>
          {stage === "open" ? (
            <motion.div
              key="open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.5, delay: reduce || seen ? 0 : 3, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              onAnimationComplete={() => setSeen(true)}
              className="mt-6"
            >
              {onShelf ? (
                <p className="text-[0.9375rem] text-ink/70">Mira is already on your shelf.</p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button onClick={place}>Place Mira on my shelf</Button>
                  <Button variant="secondary" aria-expanded={showBook} onClick={() => setShowBook((v) => !v)}>
                    {showBook ? "Close her book" : "Read her book first"}
                  </Button>
                  <Button variant="quiet" onClick={() => setStage("declined")}>
                    Not this week
                  </Button>
                </div>
              )}
              <AnimatePresence initial={false}>
                {showBook ? (
                  <motion.ol
                    initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="rule mt-5 divide-y divide-ink/10 border-y"
                  >
                    {MIRA.leaves.map((l) => (
                      <li key={l.id} className="py-4">
                        <p className="text-sm text-ink/65">{l.date}</p>
                        <p className="font-display text-[1.35rem] leading-tight">{l.title}</p>
                        <p className="mt-1 text-[1.0625rem] leading-relaxed text-ink/85">{l.body}</p>
                      </li>
                    ))}
                  </motion.ol>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : stage === "choosing" ? (
            <motion.div key="choosing" initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} className="rule mt-6 border-t pt-5">
              <h3 className="font-display text-[1.5rem] leading-tight">Your shelf holds thirty, and it’s full.</h3>
              <p className="mt-1 text-[0.9375rem] text-ink/70">Take one down to make room. These have been quiet the longest. Nobody is told.</p>
              <ul className="mt-4 grid grid-cols-1 gap-2">
                {options.map((id) => {
                  const b = bookById(id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => swap(id)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md border border-ink/15 bg-surface px-4 py-2.5 text-left transition-colors duration-300 hover:border-ink/40"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <PersonSeal initial={b.initial} size={28} state="resting" />
                          <span className="min-w-0">
                            <span className="block font-display text-[1.25rem] leading-tight">{b.title}</span>
                            <span className="text-sm text-ink/65">
                              {b.resting ? `Resting since ${b.lastLeaf.replace("in ", "")}` : `Last leaf ${b.lastLeaf}`}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-medium text-ink/75">Take down</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button variant="quiet" className="-ml-3 mt-3" onClick={() => setStage("open")}>
                Keep my shelf as it is
              </Button>
            </motion.div>
          ) : stage === "placed" ? (
            <motion.div key="placed" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE }} className="rule mt-6 flex items-start gap-5 border-t pt-5">
              <motion.span
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                <MiniSpine book={MIRA} />
              </motion.span>
              <div>
                <p className="font-display text-[1.5rem] leading-tight">Mira is on your shelf.</p>
                <p className="mt-1 text-[0.9375rem] text-ink/70">
                  {replaced ? `She took the place of ${replaced}. ` : ""}Her leaves start arriving next Sunday. She’ll only ever know she’s kept on some shelves.
                </p>
                <Button variant="quiet" className="-ml-3 mt-2" onClick={() => goToScreen("shelf")}>
                  See her on your shelf
                  <Icon name="arrow" className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.p key="declined" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE }} className="rule mt-6 border-t pt-5 text-[0.9375rem] text-ink/70">
              I won’t mention her again unless you ask.{" "}
              <button type="button" onClick={() => setStage("open")} className="link inline-flex min-h-11 items-center text-ink">
                Changed my mind
              </button>
            </motion.p>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}

function Quote({
  seal,
  who,
  when,
  text,
  mine,
  delay,
  reduce,
  rhyme,
}: {
  seal: ReactNode;
  who: string;
  when: string;
  text: string;
  rhyme: string;
  mine?: boolean;
  delay: number;
  reduce: boolean;
}) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: reduce ? 0 : delay, ease: EASE }}
      className={`flex flex-col rounded-xs p-5 ${mine ? "sheet" : "bg-ground/70"}`}
    >
      <blockquote className="flex-1 text-[1.25rem] leading-[1.5] text-ink">
        “
        {text.split(rhyme).map((part, i, all) => (
          <Fragment key={i}>
            {part}
            {i < all.length - 1 ? (
              <span className="relative inline-block">
                {rhyme}
                {/* Kata's mark: drawn in once both lines are on the page */}
                <motion.span
                  aria-hidden
                  initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
                  animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
                  transition={{ duration: 0.7, delay: reduce ? 0 : 2.05, ease: EASE }}
                  style={{ transformOrigin: "0% 50%" }}
                  className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-accent"
                />
              </span>
            ) : null}
          </Fragment>
        ))}
        ”
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3 text-sm text-ink/65">
        {seal}
        <span>
          <span className="block font-medium text-ink">{who}</span>
          {when}
        </span>
      </figcaption>
    </motion.figure>
  );
}

function SealBook({ state }: { state: ShelfState }) {
  const reduce = useReducedMotion();
  const slots = Math.max(12, Math.ceil(state.seals.length / 4) * 4);
  return (
    <aside aria-labelledby="sealbook-title" className="lg:sticky lg:top-24 lg:self-start">
      <h2 id="sealbook-title" className="font-display text-[1.75rem] leading-tight">
        Your seal book
      </h2>
      <p className="mt-1 text-[0.9375rem] text-ink/65">A seal for each writer you’ve answered in the margin. It maps who you’ve read, not who read you.</p>
      <ul className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4 rounded-xs bg-raised p-4">
        {Array.from({ length: slots }, (_, i) => {
          const s = state.seals[i];
          if (!s) {
            return (
              <li key={`empty-${i}`} aria-hidden className="flex justify-center pt-0.5">
                <span className="h-10 w-10 rounded-[22%] border-[1.5px] border-dashed border-ink/20" />
              </li>
            );
          }
          const b = bookById(s.bookId);
          const fresh = state.lastSeal === s.bookId;
          return (
            <li key={s.bookId} className="flex flex-col items-center text-center">
              <motion.span
                key={`${s.bookId}-${s.notes}`}
                initial={fresh && !reduce ? { opacity: 0, scale: 1.45, rotate: -14 } : false}
                animate={{ opacity: 1, scale: 1, rotate: -4 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="inline-block"
              >
                <PersonSeal initial={b.initial} size={40} title={`${b.pen}, ${s.notes} ${s.notes === 1 ? "note" : "notes"}`} />
              </motion.span>
              <span className="mt-1.5 line-clamp-2 w-full break-words text-[0.8125rem] leading-tight text-ink/75">{CAST.some((p) => p.id === b.id) ? b.pen.split(" ")[0] : b.pen}</span>
              <span className="text-[0.8125rem] tabular-nums text-ink/65">×{s.notes}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
