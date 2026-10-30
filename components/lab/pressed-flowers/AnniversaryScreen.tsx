"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { person, type Me } from "@/components/lab/cast";
import { MILESTONE, THEN_KEYS } from "./data";
import { EASE } from "./Pressed";
import { TreeRings } from "./TreeRings";

type Stage = "write" | "open" | "sent" | "private";

const WITNESSES = ["nani", "lena", "arjun", "mira"];

const NOTES: Record<string, { time: string; text: string }> = {
  nani: { time: "9:12 pm", text: MILESTONE.witnessNote },
  lena: { time: "10:40 pm", text: "The canal wall in March. You were already home then, you just hadn’t written it down yet." },
  arjun: { time: "8:05 pm", text: "Rasam made the list both years. Some things are load-bearing." },
  mira: { time: "7:30 pm", text: "I like that the rain stayed. Lisbon misses it on your behalf." },
};

/** Today's answer, split into the things it names. Commas stay inside an item. */
function itemsOf(text: string) {
  return text
    .split(/[.\n;!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function matchesThen(item: string) {
  const t = item.toLowerCase();
  return MILESTONE.then.some((then) => THEN_KEYS[then].some((k) => t.includes(k)));
}

function list(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function AnniversaryScreen({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState("");
  const [stage, setStage] = useState<Stage>("write");
  const [witnesses, setWitnesses] = useState<string[]>(["nani"]);
  const [evening, setEvening] = useState(false);
  const letterRef = useRef<HTMLDivElement | null>(null);

  const still = useMemo(() => {
    const text = now.toLowerCase();
    return Object.fromEntries(MILESTONE.then.map((item) => [item, THEN_KEYS[item].some((k) => text.includes(k))]));
  }, [now]);
  const gone = MILESTONE.then.filter((i) => !still[i]);
  const cameBack = MILESTONE.then.length - gone.length;
  const fresh = useMemo(() => itemsOf(now).filter((i) => !matchesThen(i)), [now]);

  const ready = now.trim().length >= 3;
  const opened = stage !== "write";

  useEffect(() => {
    if (stage !== "sent") return;
    const t = setTimeout(() => setEvening(true), reduce ? 300 : 1600);
    return () => clearTimeout(t);
  }, [stage, reduce]);

  function unseal() {
    setStage("open");
    requestAnimationFrame(() => letterRef.current?.focus({ preventScroll: true }));
  }

  function restart() {
    setStage("write");
    setNow("");
    setEvening(false);
    setWitnesses(["nani"]);
  }

  function toggleWitness(id: string) {
    setWitnesses((w) => (w.includes(id) ? w.filter((x) => x !== id) : w.length >= 3 ? w : [...w, id]));
  }

  const numberWord = ["None", "One", "Two", "All three"][cameBack];
  const freshHead = fresh[0]?.split(",")[0].trim();
  const freshLine = freshHead ? ` “${freshHead}” is new this year.` : "";
  const kataNote =
    gone.length === 0
      ? `All three came back.${freshLine} Some things don’t move when you do.`
      : cameBack === 0
        ? `None of last year’s three came back.${freshLine} A year is a long time, and that’s allowed.`
        : `${numberWord} of your three came back. ${list(gone.map((g) => (g === "Home" ? "Home" : `“${g.toLowerCase()}”`)))} didn’t.${freshLine} You don’t have to do anything with that. I thought you’d want to see it.`;

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <article aria-labelledby="pf-anniv-title" className="bg-surface px-margin pb-12 pt-8 shadow-paper max-sm:-mx-margin sm:rounded-xs sm:px-[clamp(1.75rem,4.5vw,3.25rem)] sm:pt-10">
        <header className="rule border-b pb-7">
          <p className="text-sm text-ink/65">{MILESTONE.today} · Page 398</p>
          <h2 id="pf-anniv-title" className="mt-3 font-display text-display-m">
            One year since you <span className="">moved to Berlin.</span>
          </h2>
          <p className="mt-4 flex items-center gap-2.5 text-[0.9375rem] text-ink/70">
            <Seal size={22} cut="surface" className="-rotate-6" />
            A milestone you kept on {MILESTONE.date}. It asks again today.
          </p>
        </header>

        <div className="mt-9">
          <label htmlFor="pf-anniv-now" className="block font-display text-prompt text-ink/80">
            {MILESTONE.question}
          </label>
          {stage === "write" ? (
            <>
              <p id="pf-anniv-hint" className="mt-2 text-[0.9375rem] text-ink/70">
                You answered this a year ago. Write today’s first. Last year’s stays sealed until you do.
              </p>
              <textarea
                id="pf-anniv-now"
                aria-describedby="pf-anniv-hint"
                value={now}
                onChange={(e) => setNow(e.target.value)}
                placeholder="Three things, if it helps. It did last time."
                rows={3}
                className="writing ruled mt-3 min-h-[calc(var(--rule)*3)]"
              />
              {!now ? (
                <button
                  type="button"
                  onClick={() => setNow(MILESTONE.sample)}
                  className="link mt-2 inline-flex min-h-11 items-center text-[0.9375rem] text-ink/70"
                >
                  Use a sample answer
                </button>
              ) : null}
            </>
          ) : (
            <div className="relative mt-3">
              <p className="ruled whitespace-pre-wrap pr-14 text-prose">{now}</p>
              <motion.span
                initial={{ opacity: 0, scale: reduce ? 1 : 1.8, rotate: reduce ? -8 : -30 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="absolute right-0 top-0 inline-block"
              >
                <PersonSeal initial={me.initial} size={40} title={`Written by ${me.first} today`} />
              </motion.span>
            </div>
          )}
        </div>

        {/* Last year's answer, in an envelope that only opens once today's is written. */}
        <div className="mt-10" style={{ perspective: 900 }}>
          <Envelope opened={opened} reduce={!!reduce}>
            <div ref={letterRef} tabIndex={-1} className="outline-none">
              <p className="text-sm text-ink/65">You wrote, on {MILESTONE.date}</p>
              <ul className="mt-3 space-y-1.5">
                {MILESTONE.then.map((item, i) => {
                  const isGone = !still[item];
                  return (
                    <li key={item} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                      <span className="relative font-display text-[clamp(1.7rem,1.4rem+1vw,2.2rem)] leading-tight">
                        <span className={isGone && opened ? "text-ink/55" : ""}>{item}.</span>
                        {isGone ? (
                          <motion.span
                            aria-hidden
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: opened ? 1 : 0 }}
                            transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 1.5 + i * 0.1, ease: EASE }}
                            className="absolute inset-x-0 top-[55%] h-[2px] origin-left bg-ink/60"
                          />
                        ) : null}
                      </span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: opened ? 1 : 0 }}
                        transition={{ duration: 0.5, delay: reduce ? 0 : 1.4 + i * 0.15, ease: EASE }}
                        className="text-sm text-ink/65"
                      >
                        {isGone ? "not this year" : "still here"}
                      </motion.span>
                    </li>
                  );
                })}
              </ul>
              {fresh.length ? (
                <motion.div
                  initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                  animate={{ opacity: opened ? 1 : 0, y: opened ? 0 : reduce ? 0 : 8 }}
                  transition={{ duration: 0.8, delay: reduce ? 0 : 2.3, ease: EASE }}
                  className="rule mt-5 border-t pt-4"
                >
                  <p className="text-sm text-ink/65">You wrote, today</p>
                  <ul className="mt-2 space-y-1.5">
                    {fresh.map((item) => (
                      <li key={item} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                        <span className="font-display text-[clamp(1.7rem,1.4rem+1vw,2.2rem)] leading-tight">{item}.</span>
                        <span className="text-sm text-ink">new this year</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </div>
          </Envelope>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {stage === "write" ? (
            <motion.div key="cta" exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button size="lg" onClick={unseal} disabled={!ready}>
                Seal mine and open last year’s
              </Button>
              <p className="text-sm text-ink/65">{ready ? "Yours is sealed the moment you press." : "Write a few words to open it."}</p>
            </motion.div>
          ) : (
            <motion.div
              key="after"
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: reduce ? 0 : fresh.length ? 3 : 2.2, ease: EASE }}
              className="mt-10 space-y-10"
            >
              <div className="flex gap-4">
                <Seal size={30} cut="surface" className="mt-1 -rotate-6" />
                <div>
                  <p className="text-prose text-ink/90">{kataNote}</p>
                  <p className="mt-2 font-display text-xl text-ink/70">— Kata</p>
                </div>
              </div>

              <Witnessing
                stage={stage}
                now={now}
                witnesses={witnesses}
                onToggle={toggleWitness}
                onSend={() => setStage("sent")}
                onPrivate={() => setStage("private")}
              />

              <AnimatePresence mode="wait">
                {stage === "sent" && !evening ? (
                  <motion.p
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="font-display text-xl text-ink/65"
                  >
                    Sent at 6:48 pm. The day goes on…
                  </motion.p>
                ) : null}
                {stage === "sent" && evening ? (
                  <motion.section
                    key="evening"
                    aria-live="polite"
                    aria-label="Notes from your witnesses"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease: EASE }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="rule h-px flex-1 border-t" />
                      <p className="font-display text-xl text-ink/70">That evening</p>
                      <span className="rule h-px flex-1 border-t" />
                    </div>
                    <ul className="mt-6 space-y-4">
                      {witnesses.map((id, i) => {
                        const p = person(id);
                        return (
                          <motion.li
                            key={id}
                            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: reduce ? 0 : 0.3 + i * 0.5, ease: EASE }}
                            className="chapter flex gap-4 rounded-xs p-5 sm:p-6"
                          >
                            <PersonSeal initial={p.initial} size={40} className="-rotate-3" />
                            <div className="min-w-0">
                              <p className="text-sm text-ink/65">
                                {p.first} · {p.city} · {NOTES[id].time}
                              </p>
                              <p className="mt-1.5 text-prose text-ink/90">{NOTES[id].text}</p>
                            </div>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </motion.section>
                ) : null}
              </AnimatePresence>

              <Button variant="quiet" onClick={restart} className="-ml-3">
                <Icon name="history" className="h-4 w-4" />
                Play it again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </article>

      <TreeRings />
    </div>
  );
}

function Envelope({ opened, reduce, children }: { opened: boolean; reduce: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      {/* The letter inside. It rises out once the flap lifts. */}
      <motion.div
        initial={false}
        animate={{ opacity: opened ? 1 : 0, y: opened ? 0 : reduce ? 0 : 28 }}
        transition={{ duration: reduce ? 0.3 : 1.1, delay: opened && !reduce ? 0.55 : 0, ease: EASE }}
        aria-hidden={!opened}
        className={`rule relative min-h-[13rem] rounded-xs border bg-ground px-5 py-6 sm:px-7 ${opened ? "" : "pointer-events-none"}`}
      >
        {children}
      </motion.div>

      <AnimatePresence initial={false}>
        {!opened ? (
          <motion.div
            key="sealed"
            exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : 0.35 } }}
            className="chapter absolute inset-0 overflow-hidden rounded-xs"
          >
            <div className="flex h-full flex-col justify-end px-5 pb-6 pt-[4.75rem] sm:px-7">
              <p className="font-display text-[1.6rem] leading-tight">Last year’s answer</p>
              <p className="mt-1 text-sm text-ink/65">{MILESTONE.date} · sealed until you write yours</p>
            </div>
            {/* Flap. */}
            <motion.svg
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              exit={{ rotateX: reduce ? 0 : 180, opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="absolute inset-x-0 top-0 h-16 w-full origin-top text-ink"
              aria-hidden
            >
              <path d="M0 0h100L50 20z" fill="var(--raised)" />
              <path d="M0 0L50 20 100 0" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
            </motion.svg>
            <motion.span
              exit={{ scale: reduce ? 1 : 1.25, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="absolute left-1/2 top-10 -ml-[22px] inline-block -rotate-6"
            >
              <Seal size={44} cut="raised" title="Sealed by Kata" />
            </motion.span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Witnessing({
  stage,
  now,
  witnesses,
  onToggle,
  onSend,
  onPrivate,
}: {
  stage: Stage;
  now: string;
  witnesses: string[];
  onToggle: (id: string) => void;
  onSend: () => void;
  onPrivate: () => void;
}) {
  const names = witnesses.map((id) => person(id).first);
  const [preview, setPreview] = useState(false);
  if (stage === "private") {
    return (
      <section className="rule border-t pt-7">
        <h3 className="font-display text-[1.6rem] leading-tight">Kept to yourself</h3>
        <p className="mt-1 text-[0.9375rem] text-ink/70">Nobody sees this pair. It comes back next October, just for you.</p>
      </section>
    );
  }
  if (stage === "sent") {
    return (
      <section className="rule border-t pt-7">
        <h3 className="font-display text-[1.6rem] leading-tight">Witnessed</h3>
        <p className="mt-1 text-[0.9375rem] text-ink/70">
          {list(names)} can see this question and both answers. Nothing else from your pages. Each can write you one note.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="pf-witness-title" className="rule border-t pt-7">
      <h3 id="pf-witness-title" className="font-display text-[1.6rem] leading-tight">
        Who witnesses this chapter?
      </h3>
      <p className="mt-1 text-[0.9375rem] text-ink/70">
        Up to three people see this pair, then and now, and nothing else. They can write you one note.
      </p>
      <div role="group" aria-label="Witnesses" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WITNESSES.map((id) => {
          const p = person(id);
          const on = witnesses.includes(id);
          const full = !on && witnesses.length >= 3;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              disabled={full}
              onClick={() => onToggle(id)}
              className={`flex min-h-14 items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-300 disabled:opacity-50 ${ on ? "border-ink/60 bg-ink/[0.05]" : "border-ink/15 hover:border-ink/35"
              }`}
            >
              <PersonSeal initial={p.initial} size={30} state={on ? "inked" : "resting"} />
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-medium leading-tight">{p.first}</span>
                <span className="block truncate text-[0.8125rem] text-ink/65">{p.city}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <button
          type="button"
          aria-expanded={preview}
          aria-controls="pf-witness-preview"
          onClick={() => setPreview((v) => !v)}
          className="link inline-flex min-h-11 items-center text-[0.9375rem] text-ink/75"
        >
          {preview ? "Hide what they’ll see" : "Preview what they’ll see"}
        </button>
        <AnimatePresence initial={false}>
          {preview ? (
            <motion.div
              id="pf-witness-preview"
              key="preview"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="rule mt-2 rounded-xs border bg-ground p-5">
                <p className="text-sm text-ink/65">One year since Berlin · from your pages, for {list(names) || "no one yet"}</p>
                <p className="mt-2 font-display text-[1.35rem] leading-tight">{MILESTONE.question}</p>
                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-ink/65">{MILESTONE.date}</dt>
                    <dd className="mt-0.5 text-[1.0625rem] leading-relaxed">{MILESTONE.then.map((t) => `${t}.`).join(" ")}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ink/65">Today</dt>
                    <dd className="mt-0.5 text-[1.0625rem] leading-relaxed">{now}</dd>
                  </div>
                </dl>
                <p className="rule mt-4 border-t pt-3 text-sm text-ink/65">No other page, no tags, no place. One note back each.</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={onSend} disabled={witnesses.length === 0}>
          {witnesses.length ? `Send the pair to ${list(names)}` : "Choose a witness"}
        </Button>
        <Button variant="quiet" onClick={onPrivate}>
          Keep it to myself
        </Button>
      </div>
    </section>
  );
}
