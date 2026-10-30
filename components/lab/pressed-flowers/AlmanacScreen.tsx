"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import type { Me } from "@/components/lab/cast";
import { ALMANAC_SIZE, ANSWERS, PAGES, type Answer } from "./data";
import { EASE } from "./Pressed";

const REFUSAL_EXAMPLE = "What did I think of Kenji’s wedding?";
const SUGGESTIONS = [...ANSWERS.map((a) => a.question), REFUSAL_EXAMPLE];

function match(q: string): Answer | null {
  const exact = ANSWERS.find((a) => a.question === q);
  if (exact) return exact;
  const text = q.toLowerCase();
  if (text.includes("kenji") || text.includes("wedding")) return null;
  let best: Answer | null = null;
  let score = 0;
  for (const a of ANSWERS) {
    const s = a.keys.filter((k) => text.includes(k)).length;
    if (s > score) {
      best = a;
      score = s;
    }
  }
  return best;
}

function citesOf(a: Answer) {
  const ids: string[] = [];
  for (const para of a.paragraphs) for (const part of para) if (typeof part !== "string" && !ids.includes(part.cite)) ids.push(part.cite);
  return ids;
}

export function AlmanacScreen({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState(ANSWERS[0].question);
  const [answer, setAnswer] = useState<Answer | null>(ANSWERS[0]);
  const [reading, setReading] = useState(false);
  const [cited, setCited] = useState<string | null>(citesOf(ANSWERS[0])[0]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function ask(q: string) {
    const question = q.trim();
    if (!question) return;
    setAsked(question);
    setReading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const a = match(question);
      setAnswer(a);
      setCited(a ? citesOf(a)[0] : null);
      setReading(false);
    }, reduce ? 200 : 1100);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  function openCite(id: string, e?: MouseEvent) {
    e?.preventDefault();
    setCited(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => pageRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
    }
  }

  const page = cited ? PAGES[cited] : null;
  const cites = answer ? citesOf(answer) : [];

  return (
    <div>
      <form onSubmit={onSubmit} className="max-w-[46rem]">
        <label htmlFor="pf-ask" className="block font-display text-prompt text-ink/80">
          Ask your pages anything
        </label>
        <p id="pf-ask-hint" className="mt-1 text-[0.9375rem] text-ink/70">
          Kata reads all {ALMANAC_SIZE.pages} pages and {ALMANAC_SIZE.letters} letters, answers with the days it found, and says so when it finds nothing.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            id="pf-ask"
            aria-describedby="pf-ask-hint"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="When did I last feel this tired?"
            className="control"
            autoComplete="off"
          />
          <Button type="submit" size="lg" disabled={!input.trim() || reading} className="sm:w-auto">
            Ask
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Try a question">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setInput(s);
                ask(s);
              }}
              aria-pressed={asked === s}
              className={`min-h-11 rounded-full border px-4 py-2 text-left text-[0.875rem] leading-snug transition-colors duration-300 ${ asked === s ? "border-ink/60 bg-ink/[0.05] text-ink" : "border-ink/15 text-ink/75 hover:border-ink/35 hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article
          aria-labelledby="pf-letter-q"
          aria-busy={reading}
          className="sheet relative min-h-[24rem] px-[clamp(1.4rem,5vw,3.25rem)] py-[clamp(1.75rem,5vw,3rem)] max-sm:-mx-margin max-sm:rounded-none"
        >
          <header className="rule border-b pb-5">
            <p className="text-sm text-ink/65">You asked</p>
            <h2 id="pf-letter-q" className="mt-1 font-display text-[clamp(1.7rem,1.4rem+1.2vw,2.4rem)] leading-tight">
              {asked}
            </h2>
          </header>

          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              {reading ? (
                <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="pt-8">
                  <p className="text-prose text-ink/70">Reading your pages…</p>
                  <div className="rule mt-4 h-px w-full max-w-sm overflow-hidden border-t">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: reduce ? 0 : 1.05, ease: EASE }}
                      className="-mt-px h-[2px] origin-left bg-ink/50"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={answer?.id ?? `none-${asked}`}
                  initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <div className="mt-7 max-w-[36rem] space-y-5 text-prose">
                    <p>Dear {me.first},</p>
                    {answer ? (
                      answer.paragraphs.map((para, i) => (
                        <p key={i}>
                          {para.map((part, j) =>
                            typeof part === "string" ? (
                              <span key={j}>{part}</span>
                            ) : (
                              <a
                                key={j}
                                href={`#pf-page`}
                                onClick={(e) => openCite(part.cite, e)}
                                aria-current={cited === part.cite ? "true" : undefined}
                                aria-label={`Open your page from ${PAGES[part.cite].date}`}
                                className={`whitespace-nowrap rounded-[4px] border px-1.5 py-px align-[0.08em] font-sans text-[0.78em] no-underline transition-colors duration-300 ${ cited === part.cite ? "border-accent bg-accent text-on-accent" : "border-accent/60 text-accent hover:bg-accent/10"
                                }`}
                              >
                                {part.label}
                              </a>
                            )
                          )}
                        </p>
                      ))
                    ) : (
                      <>
                        <p>
                          I looked through all {ALMANAC_SIZE.pages} pages and {ALMANAC_SIZE.letters} letters and found nothing about that.
                          I’d rather tell you so than guess.
                        </p>
                        <p>If you wrote about it somewhere else, it isn’t in Kata yet. Today’s page has room.</p>
                      </>
                    )}
                  </div>
                  <footer className="rule mt-10 flex flex-wrap items-end justify-between gap-4 border-t pt-5">
                    <div>
                      <p className="font-display text-[1.6rem] leading-none">— Kata</p>
                      <p className="mt-2 text-sm text-ink/65">
                        {answer ? `${cites.length} ${cites.length === 1 ? "page" : "pages"} cited · nothing else used` : "Nothing cited · nothing invented"}
                      </p>
                    </div>
                    <Seal size={46} cut="surface" className="-rotate-6" />
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </article>

        <aside aria-label="Cited pages" className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <h2 className="text-[0.9375rem] text-ink/65">{answer && !reading ? "The days Kata read" : "Cited pages"}</h2>
          {answer && !reading ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {cites.map((id) => {
                const on = cited === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => openCite(id)}
                      className={`inline-flex h-11 items-center gap-2 rounded-md border px-3 text-[0.9375rem] transition-colors duration-300 ${ on ? "border-ink/60 bg-ink/[0.06] text-ink" : "border-ink/15 text-ink/75 hover:border-ink/35"
                      }`}
                    >
                      {PAGES[id].date}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div ref={pageRef} id="pf-page" className="mt-5 scroll-mt-24">
            <AnimatePresence mode="wait" initial={false}>
              {page && answer && !reading ? (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="sheet flex min-h-[19rem] flex-col p-6"
                >
                  <div className="rule flex items-baseline justify-between gap-3 border-b pb-3">
                    <span className="font-display text-[1.9rem] leading-none">{page.weekday}</span>
                    <span className="text-sm text-ink/65">{page.date}</span>
                  </div>
                  <p className="mt-4 font-display text-[1.1rem] leading-tight text-ink/70">{page.prompt}</p>
                  <p className="ruled mt-1 text-[1.02rem] text-ink/90" style={{ ["--rule" as string]: "1.75rem" }}>
                    {page.text}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <Seal size={36} cut="surface" className="-rotate-[8deg]" />
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {page.tags.map((t) => (
                        <span key={t} className="rounded-sm bg-ink/[0.06] px-2 py-0.5 text-[0.8125rem] text-ink/70">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xs border border-dashed border-ink/20 px-4 py-6 text-[0.9375rem] text-ink/65"
                >
                  {reading ? "Looking…" : "No page to show. When Kata can’t point to a day, it doesn’t answer."}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  );
}
