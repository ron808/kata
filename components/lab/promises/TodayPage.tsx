"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Me } from "@/components/lab/cast";
import { person } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { CARRY_WORDS, OPEN_PROMISES, THIRD_CARRY, TODAY, type PromiseItem } from "./data";
import { EASE, HoldSeal } from "./HoldSeal";
import { names, PeoplePicker, SignedCard } from "./People";

const MAX_OPEN = 5;
// Each day a promise is carried it is written a little paler. Never below ink/65.
const FADE = ["text-ink", "text-ink/[0.84]", "text-ink/[0.74]", "text-ink/65"];

interface Row extends PromiseItem {
  kept: boolean;
  /** Witnesses who have pressed their seal beside yours. */
  cosigned: string[];
}

export function TodayPage({ me, onGoToThird }: { me: Me; onGoToThird: () => void }) {
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<Row[]>(() => OPEN_PROMISES.map((p) => ({ ...p, kept: false, cosigned: [] })));
  const [picking, setPicking] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [signed, setSigned] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const open = rows.filter((r) => !r.kept).length;
  const full = open >= MAX_OPEN;

  function keep(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setPicking(null);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, kept: true } : r)));
    if (!row.witnesses.length) {
      setStatus(`Kept: ${row.text}.`);
      return;
    }
    const who = row.witnesses.map((w) => person(w).first);
    setStatus(`Kept. ${names(who)} ${who.length > 1 ? "have" : "has"} the card now.`);
    // The card unfolds under the line straight away; each witness presses their seal into it.
    timers.current.push(setTimeout(() => setSigned(id), 650));
    // Bring the whole card into view (only if it isn't already), so the witnesses' seals are seen landing.
    timers.current.push(
      setTimeout(() => {
        document.getElementById(`signed-${id}`)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      }, 900),
    );
    row.witnesses.forEach((w, i) => {
      timers.current.push(
        setTimeout(() => {
          setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cosigned: [...r.cosigned, w] } : r)));
          setStatus(`${person(w).first} pressed their seal beside yours.`);
        }, 2100 + i * 1300),
      );
    });
  }

  function setWitnesses(id: string, ids: string[]) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, witnesses: ids } : r)));
  }

  function add(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || full) return;
    setRows((rs) => [...rs, { id: `new-${Date.now()}`, text, carried: 0, witnesses: [], kept: false, cosigned: [] }]);
    setDraft("");
  }

  const anyKept = rows.some((r) => r.kept);

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <article aria-labelledby="today-title" className="-mx-margin bg-surface px-margin pb-10 pt-7 sm:mx-0 sm:rounded-xs sm:px-[clamp(1.75rem,4.5vw,3.25rem)] sm:pt-9 sm:shadow-paper">
        <header className="rule flex items-end justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-sm text-ink/65">Page {TODAY.page}</p>
            <h2 id="today-title" className="mt-1.5 font-display text-[clamp(2.4rem,2rem+2vw,3.4rem)] leading-[0.95]">
              {TODAY.weekday}
              <span className="block text-[0.55em] text-ink/65">{TODAY.date}</span>
            </h2>
          </div>
          <p className="pb-1 text-sm text-ink/65" aria-live="polite">
            <span className="font-medium tabular-nums text-ink">{open}</span> of {MAX_OPEN} open
          </p>
        </header>

        <div className="mt-7 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-display text-prompt ">What will you keep today?</h3>
          <p className={`text-sm text-ink/65 transition-opacity duration-500 ${anyKept ? "opacity-0" : "opacity-100"}`} aria-hidden={anyKept || undefined}>
            Hold your seal to keep one
          </p>
        </div>

        <ul className="rule mt-3 border-t">
          {rows.map((r) => {
            const fade = r.kept ? "text-ink/65 line-through decoration-ink/40 decoration-1" : FADE[Math.min(r.carried, 3)];
            const witnesses = r.witnesses.map(person);
            return (
              <li key={r.id} className="rule border-b py-4">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 sm:gap-x-4">
                  <div className="-ml-1 -mt-1">
                    <HoldSeal initial={me.initial} size={36} sealed={r.kept} onSeal={() => keep(r.id)} label={`Hold to keep: ${r.text}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-prose leading-[1.45] transition-colors duration-500 ${fade}`}>{r.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink/65">
                      <span className="inline-flex items-center gap-2">
                        <CarryMarks n={r.carried} />
                        {r.kept ? "Kept today" : CARRY_WORDS[Math.min(r.carried, 3)]}
                        {r.note ? <span>· {r.note}</span> : null}
                      </span>
                      {r.kept && witnesses.length ? (
                        <span className="inline-flex items-center gap-1.5">
                          {witnesses.map((w) => (
                            <PersonSeal key={w.id} initial={w.initial} size={22} state={r.cosigned.includes(w.id) ? "inked" : "blank"} />
                          ))}
                          <span>{r.cosigned.length === witnesses.length ? "Co-signed" : "Waiting for seals"}</span>
                        </span>
                      ) : null}
                      {!r.kept ? (
                        <button
                          type="button"
                          aria-expanded={picking === r.id}
                          onClick={() => setPicking(picking === r.id ? null : r.id)}
                          className="-my-1 inline-flex h-11 items-center gap-1.5 rounded-full border border-ink/15 px-3 text-[0.875rem] text-ink/75 transition-colors duration-300 hover:border-ink/35 hover:text-ink"
                        >
                          {witnesses.length ? (
                            <>
                              <span className="inline-flex gap-1">
                                {witnesses.map((w) => (
                                  <PersonSeal key={w.id} initial={w.initial} size={22} state="blank" />
                                ))}
                              </span>
                              <span>Witnessed by {names(witnesses.map((w) => w.first))}</span>
                            </>
                          ) : (
                            <>
                              <Icon name="plus" className="h-4 w-4" />
                              witness
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {signed === r.id ? (
                    <motion.section
                      key="signed"
                      id={`signed-${r.id}`}
                      aria-label="Tonight, in your history"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="mt-5 scroll-mb-28 scroll-mt-24 sm:ml-[3.5rem]"
                    >
                      <p className="mb-3 font-display text-prompt ">
                        {r.cosigned.length < r.witnesses.length
                          ? `${names(witnesses.map((w) => w.first))} ${witnesses.length > 1 ? "have" : "has"} the card now.`
                          : "Tonight it sits in your history like this."}
                      </p>
                      <SignedCard
                        animate={false}
                        text={r.text}
                        day={`${TODAY.weekday} ${TODAY.date}`}
                        carried={r.carried}
                        signers={[
                          { initial: me.initial, name: me.first, inked: true, note: "your seal" },
                          ...witnesses.map((w) => ({ initial: w.initial, name: w.first, inked: r.cosigned.includes(w.id), note: `from ${w.city}` })),
                        ]}
                      />
                    </motion.section>
                  ) : null}
                </AnimatePresence>
                <AnimatePresence initial={false}>
                  {picking === r.id ? (
                    <motion.div
                      key="pick"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="mt-4 rounded-md bg-ink/[0.04] p-4 sm:ml-[3.5rem]"
                    >
                      <p className="font-medium">Who should witness this?</p>
                      <p className="mt-1 text-sm text-ink/70">
                        Up to three people. They get one card now and one when it ends, and nothing in between.
                      </p>
                      <div className="mt-3">
                        <PeoplePicker label="Witnesses" chosen={r.witnesses} onChange={(ids) => setWitnesses(r.id, ids)} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-ink/65">Choose people who’d be glad, not people who’d check.</p>
                        <Button variant="secondary" size="md" onClick={() => setPicking(null)}>
                          Done
                        </Button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>

        <form onSubmit={add} className="mt-4 flex items-center gap-3">
          <label htmlFor="new-promise" className="sr-only">
            New promise
          </label>
          <input
            id="new-promise"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={full}
            placeholder={full ? "Five is the most a page holds" : "Promise something small…"}
            className="writing min-h-12 min-w-0 flex-1 disabled:opacity-60"
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" disabled={!draft.trim() || full}>
            Add
          </Button>
        </form>
        {full ? <p className="mt-2 text-sm text-ink/65">Keep or release one first. A short list is a list you finish.</p> : null}

        <p className="sr-only" aria-live="polite">
          {status}
        </p>

        <div className="rule mt-10 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.9375rem] text-ink/75">
            <span className="text-ink/65">{THIRD_CARRY.text}</span> is on its third day. Kata will ask you to choose.
          </p>
          <Button variant="quiet" onClick={onGoToThird} className="self-start sm:self-auto">
            See the choice
            <Icon name="arrow" className="h-4 w-4" />
          </Button>
        </div>
      </article>

      <aside className="space-y-10 lg:pt-4">
        <section>
          <h3 className="font-medium">Try it</h3>
          <ol className="mt-3 space-y-2.5 text-[0.9375rem] text-ink/75">
            <li>Press and hold the empty seal beside the Halden application.</li>
            <li>Watch Mira and Priya press theirs.</li>
            <li>Give another promise a witness, or add one of your own.</li>
          </ol>
        </section>
        <VowScroll />
        <section>
          <h3 className="font-medium">What a witness sees</h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
            The line you wrote, the day, and how it ended. Never your pages, your mood, or how many days you carried it.
          </p>
        </section>
      </aside>
    </div>
  );
}

/** Small marks for each day a promise has been carried. */
function CarryMarks({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {Array.from({ length: Math.min(n, 3) }, (_, i) => (
        <span key={i} className="h-[7px] w-[7px] rounded-[2px] border border-ink/45" />
      ))}
    </span>
  );
}

/** A repeating promise becomes a vow scroll that fills from a yes/no field. */
function VowScroll() {
  const days = 40;
  const done = 11;
  return (
    <section>
      <h3 className="font-medium">A vow, filling</h3>
      <p className="mt-1 text-[0.9375rem] text-ink/75">300 words before work, 40 days. It fills from your “Wrote this morning?” field.</p>
      {/* A long, thin strip, like a scroll unrolling: one mark per morning. */}
      <div role="img" aria-label={`${done} of ${days} days written`} className="mt-4 grid grid-cols-20 gap-[3px]">
        {Array.from({ length: days }, (_, i) => (
          <span
            key={i}
            className={`aspect-[3/5] rounded-[1.5px] ${i < done ? "bg-ink/70" : i === done ? "border border-dashed border-ink/50" : "border border-ink/20"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/65">Eleven mornings written. Day 12 is today’s.</p>
    </section>
  );
}
