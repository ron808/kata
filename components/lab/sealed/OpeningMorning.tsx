"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FieldPrompt } from "@/components/entry/FieldPrompt";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import type { Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Envelope, EnvelopeMark } from "./Envelope";
import { EASE, PROMISES_THIS_WEEK, SEALED_PAGE, SUNDAY, TODAY, dayMonth, longDate, shortDate, weekday } from "./data";

type Stage = "week" | "sunday" | "breaking" | "unfolding" | "drawing" | "open";

// The crack runs down the middle of the seal in a few uneven steps.
const LEFT_HALF = "polygon(0 0, 54% 0, 46% 22%, 57% 41%, 44% 63%, 55% 80%, 48% 100%, 0 100%)";
const RIGHT_HALF = "polygon(54% 0, 100% 0, 100% 100%, 48% 100%, 55% 80%, 44% 63%, 57% 41%, 46% 22%)";

export function OpeningMorning({ me, onOpened }: { me: Me; onOpened: (open: boolean) => void }) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("week");
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const offerKept = done.includes("offer");

  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // The seal cracks, the flap folds back, the page slides up out of the pocket, then it is laid open.
  function breakSeal() {
    setStage("breaking");
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    if (reduce) {
      at(250, () => {
        setStage("open");
        onOpened(true);
      });
      return;
    }
    at(480, () => setStage("unfolding"));
    at(1150, () => setStage("drawing"));
    at(2250, () => {
      setStage("open");
      onOpened(true);
    });
  }

  function restart() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setDone([]);
    setReply(null);
    setDraft("");
    setStage("week");
    onOpened(false);
    top.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  function sendReply(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) setReply(draft.trim());
  }

  const fade = (y = 16) => (reduce ? { opacity: 0 } : { opacity: 0, y });

  return (
    <div ref={top} className="mx-auto max-w-[56rem] scroll-mt-24">
      <AnimatePresence mode="wait" initial={false}>
        {stage === "week" ? (
          <motion.section
            key="week"
            aria-labelledby="week-heading"
            exit={fade(-12)}
            transition={{ duration: 0.4, ease: EASE }}
            className="mx-auto max-w-[40rem]"
          >
            <p className="text-ink/65">
              {weekday(TODAY)}, {dayMonth(TODAY)}
            </p>
            <h2 id="week-heading" className="mt-1 font-display text-display-m">
              This week’s promises
            </h2>
            <ul className="sheet mt-7 px-[clamp(1rem,3.5vw,1.75rem)] py-2">
              {PROMISES_THIS_WEEK.map((p, i) => {
                const on = done.includes(p.id);
                return (
                  <li key={p.id} className={`rule ${i ? "border-t" : ""}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(p.id)}
                      className="flex min-h-16 w-full items-center gap-4 py-3 text-left"
                    >
                      <span
                        aria-hidden
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors duration-300 ${ on ? "border-ink bg-ink text-ground" : "border-ink/35"
                        }`}
                      >
                        {on ? <Icon name="check" className="h-4 w-4" strokeWidth={2.2} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[1.1875rem] leading-snug transition-colors duration-300 ${on ? "text-ink/55 line-through decoration-ink/40" : ""}`}>
                          {p.text}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-ink/65">
                          Since {shortDate(p.since)}
                          {p.sealed ? (
                            <>
                              <span aria-hidden>·</span>
                              <EnvelopeMark className="h-3 w-4" />
                              A sealed page is waiting on this
                            </>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div aria-live="polite" className="mt-6 min-h-[9rem]">
              <AnimatePresence>
                {offerKept ? (
                  <motion.div
                    key="kept"
                    initial={fade(10)}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="flex gap-4"
                  >
                    <Seal size={34} cut="ground" className="mt-1 -rotate-6" />
                    <div>
                      <p className="text-lg leading-relaxed">
                        <span className="text-accent">Kept.</span> A page you sealed on {longDate(SEALED_PAGE.date)} has been waiting fourteen months for this. It comes with Sunday’s letter.
                      </p>
                      <Button className="mt-4" onClick={() => setStage("sunday")}>
                        Skip to Sunday morning
                        <Icon name="arrow" className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p key="hint" exit={{ opacity: 0 }} className="text-[0.9375rem] text-ink/65">
                    Tick “Get the offer” to keep the promise.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        ) : (
          <motion.div key="sunday" initial={fade(24)} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
            <section
              aria-labelledby="sunday-heading"
              className={`chapter rounded-xs px-[clamp(1.25rem,5vw,3.5rem)] pt-[clamp(1.75rem,5vw,3rem)] ${stage === "open" ? "pb-24" : "pb-[clamp(2rem,5vw,3.5rem)]"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-ink/65">Weekly letter · {weekday(SUNDAY)}, {dayMonth(SUNDAY)}</p>
                  <h2 id="sunday-heading" className="mt-1 font-display text-[clamp(2.1rem,1.7rem+1.6vw,3rem)] leading-none">
                    A letter for you
                  </h2>
                </div>
                <Seal size={44} cut="ground" className="-rotate-6" />
              </div>
              <p className="mt-6 max-w-[36rem] text-prose text-ink/85">
                Dear {me.first}, you kept it. This week starts with something you sealed fourteen months ago, on a Tuesday you probably remember. I’ve written in the margins what your pages say happened next.
              </p>

              {stage !== "open" ? (
                <div className="mx-auto mt-6 max-w-[30rem]">
                  {/* Room for the flap and the page once it slides out. */}
                  <div aria-hidden className="pt-[25%]" />
                  <Envelope
                    open={stage === "unfolding" || stage === "drawing"}
                    drawn={stage === "drawing"}
                    seal={<BreakingSeal broken={stage !== "sunday"} reduce={!!reduce} />}
                  >
                    <p className="truncate text-center font-display text-[clamp(1.2rem,1rem+1vw,1.6rem)] leading-tight">For the day I get the offer</p>
                    <p className="mt-1 text-center text-[0.8125rem] text-ink/65">Sealed {shortDate(SEALED_PAGE.date)} · opens when the promise is kept</p>
                  </Envelope>
                  <div className="mt-8 flex min-h-12 justify-center">
                    {stage === "sunday" ? (
                      <Button size="lg" onClick={breakSeal}>
                        Break the seal
                      </Button>
                    ) : (
                      <p aria-live="polite" className="self-center text-ink/70">
                        Fourteen months, and here it is.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>

            {stage === "open" ? (
              <>
                <motion.article
                  aria-labelledby="sealed-page-date"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -36, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 1.1, ease: EASE }}
                  className="sheet relative -mt-16 overflow-hidden bg-[color-mix(in_oklab,var(--surface)_70%,var(--raised))] px-[clamp(1.25rem,4.5vw,3rem)] pb-10 pt-8 sm:mx-[clamp(0.75rem,3vw,2.5rem)]"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,color-mix(in_oklab,var(--raised)_85%,transparent))]" />
                  {/* Where it was folded to fit the envelope. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-[34%] h-16 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--ink)_2.5%,transparent)_50%,transparent)]"
                  />
                  <div className="relative">
                    <header className="rule flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-5">
                      <h3 id="sealed-page-date" className="font-display text-[clamp(2.2rem,1.8rem+1.8vw,3.2rem)] leading-[0.95]">
                        {weekday(SEALED_PAGE.date)}
                        <span className="block text-[0.5em] text-ink/65">{longDate(SEALED_PAGE.date)}</span>
                      </h3>
                      <p className="text-sm text-ink/65">Page {SEALED_PAGE.number} · sealed until “Get the offer”</p>
                    </header>

                    <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-[minmax(0,1fr)_14.5rem]">
                      <div>
                        <FieldPrompt as="p">{SEALED_PAGE.note.prompt}</FieldPrompt>
                        <motion.p
                          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 1.1, delay: reduce ? 0.1 : 0.45, ease: EASE }}
                          className="mt-3 text-balance font-display text-[clamp(2.1rem,1.5rem+2.6vw,3.4rem)] leading-[1.02] text-ink"
                        >
                          {SEALED_PAGE.note.lead}
                        </motion.p>
                        <p className="ruled mt-4 text-prose text-ink/90">{SEALED_PAGE.note.rest}</p>
                      </div>
                      <MarginNote label="Kata, in the margin" now={SEALED_PAGE.note.now} delay={reduce ? 0.2 : 1.4} reduce={!!reduce} className="md:mt-24" />
                    </div>

                    <p className="rule mt-10 border-t pt-5 text-sm text-ink/65">The page you wrote that day</p>
                    <div className="mt-5 space-y-9">
                      {SEALED_PAGE.sections.map((s, i) => (
                        <div key={s.prompt} className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-[minmax(0,1fr)_14.5rem]">
                          <div className="space-y-2">
                            <FieldPrompt as="p">{s.prompt}</FieldPrompt>
                            <p className="ruled text-prose text-ink/90">{s.text}</p>
                          </div>
                          <MarginNote label="Then and now" then={s.then} now={s.now} delay={(reduce ? 0.3 : 2) + i * 0.5} reduce={!!reduce} className="md:mt-11" />
                        </div>
                      ))}
                    </div>

                    <footer className="mt-10 flex items-center gap-3">
                      <PersonSeal initial={me.initial} size={44} className="-rotate-6" />
                      <p className="text-sm text-ink/65">
                        Sealed by {me.first}, {longDate(SEALED_PAGE.date)} · opened {longDate(SUNDAY)}
                      </p>
                    </footer>
                  </div>
                </motion.article>

                <motion.section
                  aria-labelledby="reply-heading"
                  initial={fade(16)}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: reduce ? 0.3 : 2.8, ease: EASE }}
                  className="mx-auto mt-14 max-w-[40rem]"
                >
                  <h3 id="reply-heading" className="font-display text-prompt">
                    {reply ? "The thread, across the years" : "Answer with a page of your own"}
                  </h3>
                  {reply ? (
                    <>
                      <ol className="relative mt-6 space-y-6 before:absolute before:bottom-6 before:left-[21px] before:top-6 before:w-px before:bg-ink/15">
                        <ThreadItem seal={<PersonSeal initial={me.initial} size={44} state="resting" />} when={`${shortDate(SEALED_PAGE.date)} · you, in the car park`} text={SEALED_PAGE.note.lead} />
                        <ThreadItem seal={<PersonSeal initial={me.initial} size={44} />} when={`${shortDate(SUNDAY)} · you, with the offer`} text={reply} fresh reduce={!!reduce} />
                      </ol>
                      <p className="mt-6 text-[0.9375rem] text-ink/70">
                        Threaded. Whenever one of these pages comes back to you, the other comes with it.
                      </p>
                      <Button variant="quiet" className="-ml-3 mt-4" onClick={restart}>
                        Play it again
                      </Button>
                    </>
                  ) : (
                    <form onSubmit={sendReply} className="sheet mt-5 px-[clamp(1.25rem,4vw,2rem)] pb-5 pt-6">
                      <FieldPrompt htmlFor="reply-draft">Write back to August 2025</FieldPrompt>
                      <textarea
                        id="reply-draft"
                        rows={3}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Dear me in the car park…"
                        className="writing ruled mt-2 block"
                      />
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-ink/65">Nobody likes or comments here. It’s just you, a year on.</p>
                        <Button type="submit" disabled={!draft.trim()}>
                          Seal your reply
                        </Button>
                      </div>
                    </form>
                  )}
                </motion.section>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarginNote({ label, then, now, delay, reduce, className = "" }: { label: string; then?: string; now: string; delay: number; reduce: boolean; className?: string }) {
  return (
    <motion.aside
      aria-label="Kata, then and now"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={`border-l-2 border-accent/50 pl-4 ${className}`}
    >
      <p className="text-[0.8125rem] text-accent">{label}</p>
      {then ? <p className="mt-1 font-display text-[1.15rem] leading-snug text-ink/70">{then}</p> : null}
      <p className="mt-1.5 text-[1rem] leading-relaxed text-ink/85">{now}</p>
    </motion.aside>
  );
}

/** Kata's seal on the envelope; on "broken" it splits along the crack and falls away. */
function BreakingSeal({ broken, reduce }: { broken: boolean; reduce: boolean }) {
  const t = { duration: reduce ? 0.2 : 0.75, ease: EASE };
  return (
    <span className="relative block h-[72px] w-[72px] -rotate-6">
      <motion.span
        className="absolute inset-0"
        style={{ clipPath: LEFT_HALF }}
        initial={false}
        animate={broken ? (reduce ? { opacity: 0 } : { opacity: 0, x: -22, y: 10, rotate: -18 }) : { opacity: 1, x: 0, y: 0, rotate: 0 }}
        transition={t}
      >
        <Seal size={72} cut="surface" />
      </motion.span>
      <motion.span
        className="absolute inset-0"
        style={{ clipPath: RIGHT_HALF }}
        initial={false}
        animate={broken ? (reduce ? { opacity: 0 } : { opacity: 0, x: 22, y: 14, rotate: 16 }) : { opacity: 1, x: 0, y: 0, rotate: 0 }}
        transition={t}
      >
        <Seal size={72} cut="surface" />
      </motion.span>
    </span>
  );
}

function ThreadItem({ seal, when, text, fresh, reduce }: { seal: ReactNode; when: string; text: string; fresh?: boolean; reduce?: boolean }) {
  return (
    <motion.li
      initial={fresh ? (reduce ? { opacity: 0 } : { opacity: 0, y: 12 }) : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative flex gap-4"
    >
      <span className="relative bg-ground">{seal}</span>
      <div className="min-w-0 pt-1">
        <p className="text-sm text-ink/65">{when}</p>
        <p className="mt-1 text-lg leading-relaxed text-ink/90">{text}</p>
      </div>
    </motion.li>
  );
}
