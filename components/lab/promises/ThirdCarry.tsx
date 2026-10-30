"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Me } from "@/components/lab/cast";
import { person } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import { THIRD_CARRY, TODAY } from "./data";
import { EASE, HoldSeal } from "./HoldSeal";
import { names, PeoplePicker } from "./People";

type Choice = "keep" | "release" | "ask";
type Outcome = { kind: "keep"; step: string } | { kind: "release"; why: string } | { kind: "ask"; to: string[]; by: string; text: string };

const CHOICES: { value: Choice; label: string; line: string }[] = [
  { value: "keep", label: "Keep", line: "With a smaller first step" },
  { value: "release", label: "Release", line: "With one line of why" },
  { value: "ask", label: "Ask", line: "Named people, by a day" },
];
const FADE = ["text-ink", "text-ink/[0.84]", "text-ink/[0.74]", "text-ink/65"];

export function ThirdCarry({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [choice, setChoice] = useState<Choice>("keep");
  const [step, setStep] = useState(THIRD_CARRY.firstStep);
  const [why, setWhy] = useState("");
  const [ask, setAsk] = useState(THIRD_CARRY.askDraft);
  const [to, setTo] = useState<string[]>(THIRD_CARRY.suggested);
  const [by, setBy] = useState(THIRD_CARRY.byDays[0]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const fade = reduce ? { opacity: 0 } : { opacity: 0, y: 10 };

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-6">
        {/* The same promise, written once a day, a little paler each time. */}
        <section aria-labelledby="carry-title" className="sheet px-[clamp(1.25rem,4vw,2.5rem)] py-6">
          <h2 id="carry-title" className="text-sm text-ink/65">
            Carried since {THIRD_CARRY.since}
          </h2>
          <ol className="mt-3">
            {THIRD_CARRY.days.map((d, i) => {
              const last = i === THIRD_CARRY.days.length - 1;
              const text = last && outcome?.kind === "keep" ? outcome.step : THIRD_CARRY.text;
              const released = last && outcome?.kind === "release";
              return (
                <li key={d} className="rule grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-3 border-b py-2.5 last:border-b-0">
                  <span className="font-display text-xl text-ink/65">{d}</span>
                  <span
                    className={`text-prose leading-snug transition-colors duration-500 ${ released ? "text-ink/65 line-through decoration-ink/40 decoration-1" : last && outcome?.kind === "keep" ? "text-ink" : FADE[i]
                    }`}
                  >
                    {text}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <AnimatePresence mode="wait" initial={false}>
          {!outcome ? (
            <motion.section
              key="ask-kata"
              aria-labelledby="choose-title"
              initial={fade}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="chapter rounded-xs px-[clamp(1.25rem,4vw,2.5rem)] pb-7 pt-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-ink/65">From Kata · {TODAY.weekday} morning</p>
                  <h2 id="choose-title" className="mt-2 font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.5rem)] leading-[1.05]">
                    This one has been with you since {THIRD_CARRY.since}.
                  </h2>
                </div>
                <Seal size={40} cut="ground" className="mt-1 -rotate-6" />
              </div>
              <p className="mt-3 max-w-[34rem] text-lg leading-relaxed text-ink/85">
                That’s not a mark against you. It means the promise is the wrong size, or the wrong one, or not yours alone. Which is it?
              </p>

              <div role="radiogroup" aria-label="What to do with it" className="mt-6 grid grid-cols-3 gap-1 rounded-md border border-ink/15 p-1">
                {CHOICES.map((c) => {
                  const on = choice === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setChoice(c.value)}
                      className={`min-h-14 rounded-sm px-2 py-2 text-center transition-colors duration-300 sm:px-3 sm:text-left ${ on ? "bg-ink text-ground" : "text-ink/75 hover:bg-ink/[0.06] hover:text-ink"
                      }`}
                    >
                      <span className="block text-[0.9375rem] font-medium">{c.label}</span>
                      <span className={`hidden text-sm sm:block ${on ? "text-ground/75" : "text-ink/65"}`}>{c.line}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                {choice === "keep" ? (
                  <div className="space-y-4">
                    <label htmlFor="first-step" className="block text-[0.9375rem] text-ink/80">
                      Kata suggests a first step small enough to do today. Change it if you like.
                    </label>
                    <input id="first-step" value={step} onChange={(e) => setStep(e.target.value)} className="control " />
                    <Button size="lg" disabled={!step.trim()} onClick={() => setOutcome({ kind: "keep", step: step.trim() })}>
                      Keep it, smaller
                    </Button>
                  </div>
                ) : choice === "release" ? (
                  <div className="space-y-4">
                    <label htmlFor="release-why" className="block text-[0.9375rem] text-ink/80">
                      One line of why. It stays on your page; nobody else sees it.
                    </label>
                    <input
                      id="release-why"
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      placeholder={THIRD_CARRY.releasePlaceholder}
                      className="control "
                    />
                    <Button size="lg" disabled={!why.trim()} onClick={() => setOutcome({ kind: "release", why: why.trim() })}>
                      Release it
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="ask-text" className="block text-[0.9375rem] text-ink/80">
                        What they’ll read. Only this line is shared.
                      </label>
                      <textarea id="ask-text" value={ask} onChange={(e) => setAsk(e.target.value)} rows={2} className="control mt-2 resize-none " />
                    </div>
                    <div>
                      <p className="text-[0.9375rem] text-ink/80" id="ask-to">
                        Ask whom
                      </p>
                      <div className="mt-2">
                        <PeoplePicker label="Ask whom" chosen={to} onChange={setTo} exclude={["nani"]} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[0.9375rem] text-ink/80">By</p>
                      <div role="radiogroup" aria-label="By when" className="mt-2 flex flex-wrap gap-2">
                        {THIRD_CARRY.byDays.map((d) => (
                          <button
                            key={d}
                            type="button"
                            role="radio"
                            aria-checked={by === d}
                            onClick={() => setBy(d)}
                            className={`h-11 rounded-full border px-4 text-[0.9375rem] transition-colors duration-300 ${ by === d ? "border-ink bg-ink text-ground" : "border-ink/15 text-ink/75 hover:border-ink/35"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button size="lg" disabled={!to.length || !ask.trim()} onClick={() => setOutcome({ kind: "ask", to, by, text: ask.trim() })}>
                      {to.length ? `Ask ${names(to.map((id) => person(id).first))}` : "Choose someone"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.section>
          ) : (
            <motion.div key="outcome" initial={fade} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              {outcome.kind === "keep" ? (
                <Result
                  title="Kept, and made smaller."
                  body="Fresh ink tomorrow. The carry count starts again, and the case study waits behind this one step."
                  onReset={() => setOutcome(null)}
                />
              ) : outcome.kind === "release" ? (
                <Released why={outcome.why} onReset={() => setOutcome(null)} />
              ) : (
                <Asked me={me} outcome={outcome} onReset={() => setOutcome(null)} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="space-y-8 lg:pt-2">
        <section>
          <h3 className="font-medium">Why the third day</h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
            Carrying something once is normal. By the third morning the list has started to weigh more than the work, so Kata asks once, kindly, and then lets it be.
          </p>
        </section>
        <section>
          <h3 className="font-medium">Release is not failure</h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
            Released promises are never counted against you, never shown in red, and never mentioned to witnesses unless you choose to say more.
          </p>
        </section>
      </aside>
    </div>
  );
}

function Result({ title, body, onReset }: { title: string; body: string; onReset: () => void }) {
  return (
    <section className="rounded-xs border border-ink/15 px-[clamp(1.25rem,4vw,2.5rem)] py-6">
      <h2 className="font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.5rem)] leading-[1.05]">{title}</h2>
      <p className="mt-2 max-w-[34rem] text-[0.9375rem] leading-relaxed text-ink/75">{body}</p>
      <Button variant="quiet" className="-ml-3 mt-4" onClick={onReset}>
        Choose again
      </Button>
    </section>
  );
}

function Released({ why, onReset }: { why: string; onReset: () => void }) {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-clip rounded-xs border border-ink/15 px-[clamp(1.25rem,4vw,2.5rem)] py-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-[30rem]">
          <h2 className="font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.5rem)] leading-[1.05]">Released, with a reason.</h2>
          <p className="mt-3 text-lg leading-relaxed text-ink/80">“{why}”</p>
          <p className="mt-3 text-[0.9375rem] text-ink/70">It leaves the list today. It isn’t counted, and nobody is told.</p>
        </div>
        {/* The release stamp: ink, not vermilion. A closing, not a verdict. */}
        <motion.div
          aria-hidden
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.5, rotate: -20 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -6 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
          className="grid h-24 w-24 shrink-0 place-items-center rounded-[22%] border-[3px] border-double border-ink/55 text-center text-ink/70"
        >
          <span>
            <span className="block font-display text-[1.55rem] leading-none">Let go</span>
            <span className="mt-1 block text-sm">{TODAY.date.split(" ")[0]} Oct</span>
          </span>
        </motion.div>
      </div>
      <Button variant="quiet" className="-ml-3 mt-4" onClick={onReset}>
        Choose again
      </Button>
    </section>
  );
}

function Asked({ me, outcome, onReset }: { me: Me; outcome: { to: string[]; by: string; text: string }; onReset: () => void }) {
  const reduce = useReducedMotion();
  const helper = outcome.to.includes(THIRD_CARRY.reply.from) ? person(THIRD_CARRY.reply.from) : person(outcome.to[0]);
  const [replied, setReplied] = useState(false);
  const [helped, setHelped] = useState(false);
  const [sealed, setSealed] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = t.current;
    timers.push(setTimeout(() => setReplied(true), 1500));
    timers.push(setTimeout(() => setHelped(true), 3600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const replyText = helper.id === THIRD_CARRY.reply.from ? THIRD_CARRY.reply.text : "I can do that. Send it tonight and I’ll read it in the morning.";

  return (
    <section className="space-y-4">
      <div className="rounded-xs border border-ink/15 px-[clamp(1.25rem,4vw,2.5rem)] py-6">
        <p className="text-sm text-ink/65">
          Sent to {names(outcome.to.map((id) => person(id).first))} · by {outcome.by}
        </p>
        <p className="mt-2 text-lg leading-relaxed">{outcome.text}</p>
        <p className="mt-3 text-sm text-ink/65" aria-live="polite">
          {replied ? `${helper.first} replied` : "Delivered. No one else can see it."}
        </p>
      </div>

      <AnimatePresence>
        {replied ? (
          <motion.div
            key="reply"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="sheet px-[clamp(1.25rem,4vw,2.5rem)] py-6"
          >
            <Message initial={helper.initial} name={helper.first} when={`${TODAY.weekday}, a little later`} text={replyText} />

            <AnimatePresence>
              {helped ? (
                <motion.div
                  key="done"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="mt-5"
                >
                  <Message initial={helper.initial} name={helper.first} when={THIRD_CARRY.done.when} text={THIRD_CARRY.done.text} />
                  <div className="rule mt-6 border-t pt-5">
                    {!sealed ? (
                      <HoldSeal
                        initial={me.initial}
                        size={40}
                        sealed={sealed}
                        onSeal={() => setSealed(true)}
                        label={`Hold to keep it, and say ${helper.first} helped`}
                        hint={`Hold your seal to keep it, and say ${helper.first} helped`}
                      />
                    ) : (
                      <DoubleSeal me={me} helper={helper} />
                    )}
                  </div>
                </motion.div>
              ) : (
                <p key="wait" className="mt-5 text-sm text-ink/65">
                  The promise stays on your page, now with {helper.first}’s name beside it.
                </p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button variant="quiet" className="-ml-3" onClick={onReset}>
        Choose again
      </Button>
    </section>
  );
}

function Message({ initial, name, when, text }: { initial: string; name: string; when: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <PersonSeal initial={initial} size={34} />
      <div className="min-w-0">
        <p className="text-[0.9375rem]">
          <span className="font-medium">{name}</span> <span className="text-sm text-ink/65">· {when}</span>
        </p>
        <p className="mt-1 text-lg leading-relaxed text-ink/85">{text}</p>
      </div>
    </div>
  );
}

function DoubleSeal({ me, helper }: { me: Me; helper: ReturnType<typeof person> }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex items-center" aria-hidden>
        <span className="-rotate-[7deg]">
          <PersonSeal initial={me.initial} size={52} />
        </span>
        <motion.span
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: 20 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 6 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.5 }}
          className="-ml-3"
        >
          <PersonSeal initial={helper.initial} size={52} className="bg-surface" />
        </motion.span>
      </div>
      <div className="min-w-0">
        <p className="font-display text-[1.6rem] leading-tight">A double seal, on both pages.</p>
        <p className="mt-1 text-[0.9375rem] text-ink/70">
          Yours reads “{helper.first} helped.” Theirs reads “Helped {me.first}.”
        </p>
      </div>
    </div>
  );
}
