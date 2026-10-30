"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { person } from "@/components/lab/cast";
import { Button } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import type { CircleActions, CircleState } from "./CirclesPrototype";
import { EASE, SealRing } from "./bits";
import { INTENTIONS, MY_INTENTION, OTHERS_LINE_COUNT, WOVEN, circleById } from "./data";
import { weekLines } from "./SaturdayPreview";

const FAMILY = circleById("rao");
const TIRED = /tired|exhaust|drain|wiped|knackered|worn out|long day|no sleep/i;

type Phase = "sealed" | "opening" | "open";

export function SundayLetter({ state, actions }: { state: CircleState; actions: CircleActions }) {
  const [phase, setPhase] = useState<Phase>("sealed");
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function open() {
    if (reduce) {
      setPhase("open");
      return;
    }
    setPhase("opening");
    timer.current = setTimeout(() => setPhase("open"), 1650);
  }

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {phase !== "open" ? (
          <motion.div
            key="envelope"
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex flex-col items-center pb-6 pt-[clamp(0.5rem,4vw,3rem)] text-center"
          >
            <motion.div animate={{ opacity: phase === "opening" ? 0 : 1 }} transition={{ duration: 0.5, ease: EASE }}>
              <p className="text-ink/65">Sunday 25 October · 8:00 am, in each of your time zones</p>
              <h2 className="mt-2 font-display text-display-m">A letter for the whole family</h2>
            </motion.div>
            <Envelope opening={phase === "opening"} me={state.me.initial} />
            <Button size="lg" className="mt-10" onClick={open} disabled={phase === "opening"}>
              {phase === "opening" ? "Opening…" : "Open the letter"}
            </Button>
            <p className="mt-3 max-w-sm text-sm text-ink/65">The same letter lands for all five of you at once.</p>
            {!state.sealed && phase === "sealed" ? <UnsealedNote onSeal={() => actions.setSealed(true)} /> : null}
          </motion.div>
        ) : (
          <motion.div
            key="letter"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12"
          >
            <Letter state={state} heading={heading} onFold={() => setPhase("sealed")} />
            <aside className="min-w-0 space-y-10 lg:col-span-4">
              <Intentions me={state.me.initial} />
              <Reply me={state.me.initial} />
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A dark envelope (a .chapter object) whose flap lifts and lets the letter rise. */
function Envelope({ opening, me }: { opening: boolean; me: string }) {
  const [flapBehind, setFlapBehind] = useState(false);
  useEffect(() => {
    if (!opening) return;
    const t = setTimeout(() => setFlapBehind(true), 560);
    return () => clearTimeout(t);
  }, [opening]);
  const behind = opening && flapBehind;

  return (
    <div className="relative mt-[clamp(3.5rem,9vw,6rem)] aspect-[16/10] w-full max-w-[34rem] [perspective:1400px]">
      <div className="chapter absolute inset-0 rounded-xs shadow-paper" />
      <motion.div
        aria-hidden
        animate={opening ? { y: "-40%" } : { y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: opening ? 0.75 : 0 }}
        className="sheet absolute inset-x-[6%] bottom-[7%] top-[6%] z-10 px-[6%] pt-[6%] text-left"
      >
        <p className="text-[clamp(0.9375rem,2.6vw,1.125rem)]">Dear Rao family,</p>
        <div className="mt-3 space-y-[0.7em]">
          {[92, 100, 84, 96].map((w) => (
            <span key={w} className="block h-px bg-ink/15" style={{ width: `${w}%` }} />
          ))}
        </div>
      </motion.div>
      <div
        className="chapter absolute inset-0 z-20 flex items-end justify-between gap-4 rounded-xs bg-surface px-[6%] pb-[5%] text-left"
        style={{ clipPath: "polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)" }}
      >
        <div className="min-w-0">
          <p className="font-display text-[clamp(1.35rem,4vw,2rem)] leading-none">The Rao family</p>
          <p className="mt-1.5 text-[0.8125rem] text-ink/70">Week of 19 to 25 October</p>
        </div>
        <SealRing ids={FAMILY.members} me={{ name: "", first: "", initial: me }} size={22} />
      </div>
      {/* A hairline edge, so the envelope holds its shape on a dark page too. */}
      <svg aria-hidden viewBox="0 0 160 100" preserveAspectRatio="none" className="chapter pointer-events-none absolute inset-0 z-[25] h-full w-full rounded-xs bg-transparent text-ink/15">
        <path d="M0 0 V100 H160 V0" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <motion.div
        aria-hidden
        initial={false}
        animate={{ rotateX: opening ? 180 : 0 }}
        transition={{ duration: 0.75, ease: EASE, delay: opening ? 0.25 : 0 }}
        className={`chapter absolute inset-x-0 top-0 h-[57%] origin-top rounded-t-xs bg-raised [backface-visibility:visible] ${behind ? "z-[5]" : "z-30"}`}
        style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
      />
      <motion.span
        animate={opening ? { opacity: 0, scale: 1.2 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="chapter absolute left-1/2 top-[57%] z-40 -ml-[1.75rem] -mt-[1.75rem] bg-transparent"
      >
        <Seal size={56} cut="raised" className="-rotate-6" title="Sealed by Kata" />
      </motion.span>
    </div>
  );
}

function Q({ children }: { children: ReactNode }) {
  return <q>{children}</q>;
}

function Letter({
  state,
  heading,
  onFold,
}: {
  state: CircleState;
  heading: React.RefObject<HTMLHeadingElement | null>;
  onFold: () => void;
}) {
  const reduce = useReducedMotion();
  const me = state.me.first;
  // The letter mounts once the envelope has gone: bring its heading into view and focus.
  useEffect(() => {
    heading.current?.focus();
  }, [heading]);
  const days = weekLines(state);
  const mine = (id: string) => {
    const d = days.find((x) => x.id === id)!;
    return d.line && !state.struck[d.id] ? d.line : null;
  };
  const myCount = days.filter((d) => d.line && !state.struck[d.id]).length;
  const wed = mine("wed");
  const wedTired = !!wed && TIRED.test(wed);

  const tired = [
    ...FAMILY.tonight
      .filter((o) => o.personId !== "nani")
      .map((o) => ({ id: o.personId, name: person(o.personId).first, initial: person(o.personId).initial, line: o.line!, when: o.when!.replace(" · ", ", ") })),
    ...(wedTired ? [{ id: "me", name: me, initial: state.me.initial, line: wed!, when: "9:40 pm, at home" }] : []),
  ];
  const count = tired.length === 4 ? "four" : "three";

  const paras: { key: string; node: ReactNode; block?: boolean; className?: string }[] = [
    { key: "dear", node: "Dear Rao family," },
    {
      key: "open",
      node: (
        <>
          Between Hyderabad, Bengaluru, Toronto and Porto, the five of you offered {OTHERS_LINE_COUNT + myCount} lines this week. I read only those, and here is what they said together.
        </>
      ),
    },
    {
      key: "wed",
      node: <>On Wednesday, {count} of you wrote about being tired, each in a different time zone and none of you knowing about the others.</>,
    },
    {
      key: "wed-figure",
      block: true,
      node: (
        <ul className="rule space-y-4 border-l-2 py-1 pl-[clamp(0.9rem,3vw,1.5rem)] text-[1.125rem] leading-snug">
          {tired.map((t, i) => (
            <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5">
              <PersonSeal initial={t.initial} size={30} className={`mt-0.5 ${i % 2 ? "rotate-3" : "-rotate-3"}`} />
              <span>
                <Q>{t.line}</Q>
                <span className="mt-1 block font-sans text-[0.8125rem] text-ink/65">
                  {t.name} · {t.when}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    { key: "nani-lead", node: <>That same evening, Nani sent one line by email:</> },
    {
      key: "nani",
      block: true,
      className: "py-2",
      node: (
        <figure className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <PersonSeal initial="N" size={44} className="-rotate-6" />
          <div>
            <blockquote className="font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-[1.1]">
              “I made the dal you all like.”
            </blockquote>
            <figcaption className="mt-1.5 font-sans text-[0.8125rem] text-ink/65">Nani · Hyderabad · Wednesday, 7:05 pm</figcaption>
          </div>
        </figure>
      ),
    },
    {
      key: "nani-after",
      node: (
        <>
          Hers came in first, hours before any of yours, so none of you had said a word yet. She only knew she was cooking for people who weren’t there. Perhaps she didn’t need telling.
        </>
      ),
    },
  ];

  const fri = mine("fri");
  if (fri)
    paras.push({
      key: "fri",
      node: (
        <>
          Two days later {me} cooked it from her video and wrote, <Q>{fri}</Q> Some things don’t travel by video. They may need a visit.
        </>
      ),
    });

  const tue = mine("tue");
  const mon = mine("mon");
  const extraWed = wed && !wedTired ? wed : null;
  paras.push({
    key: "weave",
    node: (
      <>
        The rest of the week, in your own words. On Monday Dina swam and reported back: <Q>{WOVEN.anaMon}</Q>
        {mon ? (
          <>
            {" "}{me}, the same evening: <Q>{mon}</Q>
          </>
        ) : null}
        {tue ? (
          <>
            {" "}On Tuesday {me} wrote, <Q>{tue}</Q> Well, now everybody knows.
          </>
        ) : null}
        {extraWed ? (
          <>
            {" "}{me}’s Wednesday, in a line: <Q>{extraWed}</Q>
          </>
        ) : null}{" "}
        On Thursday Nani planted something: <Q>{WOVEN.naniThu}</Q> The same day, Arjun: <Q>{WOVEN.arjunThu}</Q>
      </>
    ),
  });

  const thu = mine("thu");
  paras.push({
    key: "replies",
    node: (
      <>
        From last week’s replies, Priya: <Q>{WOVEN.priyaReply}</Q> Arjun’s answer came on Thursday: <Q>{WOVEN.arjunAnswer}</Q>
      </>
    ),
  });
  paras.push({
    key: "close",
    node: thu ? (
      <>
        And {me}, on Thursday: <Q>{thu}</Q> After the Wednesday you all had, I hope the rest of you get one of those this week. I’ll write again next Sunday.
      </>
    ) : (
      <>After the Wednesday you all had, I hope this week is kinder to all five of you. I’ll write again next Sunday.</>
    ),
  });

  return (
    <article aria-labelledby="circle-letter" className="sheet min-w-0 px-[clamp(1.25rem,5vw,3.5rem)] py-[clamp(1.6rem,5vw,3.25rem)] lg:col-span-8">
      <header className="rule flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b pb-6">
        <div>
          <h2 id="circle-letter" ref={heading} tabIndex={-1} className="font-display text-[clamp(1.9rem,1.5rem+1.4vw,2.6rem)] leading-none outline-none">
            The Rao family
          </h2>
          <p className="mt-2 text-sm text-ink/65">19 to 25 October · to all five of you</p>
        </div>
        <SealRing ids={FAMILY.members} me={state.me} size={28} label="Seals of all five of you" />
      </header>
      <div className="mt-7 max-w-[38rem] space-y-5 text-prose">
        {paras.map((p, i) => (
          <motion.div
            key={p.key}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.12 }}
            className={p.className}
          >
            {p.block ? p.node : <p>{p.node}</p>}
          </motion.div>
        ))}
      </div>
      <footer className="mt-10 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-[1.75rem] leading-none">— Kata</p>
          <p className="mt-3 max-w-xs text-[0.8125rem] text-ink/65">Every quote is word for word, from lines offered to the circle. Nothing else was read.</p>
        </div>
        <Seal size={52} cut="surface" className="-rotate-6" />
      </footer>
      <div className="rule mt-8 border-t pt-4">
        <Button variant="quiet" size="sm" className="-ml-3 h-11" onClick={onFold}>
          Fold it back into the envelope
        </Button>
      </div>
    </article>
  );
}

function Intentions({ me }: { me: string }) {
  const [kept, setKept] = useState(false);
  const reduce = useReducedMotion();
  return (
    <section aria-labelledby="intentions">
      <h3 id="intentions" className="font-display text-[1.6rem] leading-tight">
        This week’s intentions
      </h3>
      <p className="mt-1 text-sm text-ink/65">One each. A seal when it’s kept.</p>
      <ul className="rule mt-4 divide-y divide-ink/10 border-y">
        {INTENTIONS.map((it) => {
          const p = person(it.personId);
          return (
            <li key={it.personId} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-3.5">
              <PersonSeal initial={p.initial} size={30} state={it.kept ? "inked" : "blank"} className={it.kept ? "-rotate-6" : ""} />
              <div className="min-w-0">
                <p className="text-[1.0625rem] leading-snug">{it.text}</p>
                <p className="mt-0.5 text-[0.8125rem] text-ink/65">
                  {p.first} · {it.kept ?? "still open"}
                </p>
              </div>
            </li>
          );
        })}
        <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-3.5">
          <span className="grid h-[30px] w-[30px] place-items-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={kept ? "k" : "o"}
                initial={reduce || !kept ? { opacity: 0 } : { opacity: 0, scale: 1.7, rotate: -24 }}
                animate={{ opacity: 1, scale: 1, rotate: kept ? -6 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <PersonSeal initial={me} size={30} state={kept ? "inked" : "blank"} />
              </motion.span>
            </AnimatePresence>
          </span>
          <div className="min-w-0">
            <p className="text-[1.0625rem] leading-snug">{MY_INTENTION}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3">
              <p className="text-[0.8125rem] text-ink/65">You · {kept ? "kept today" : "still open"}</p>
              <button
                type="button"
                aria-pressed={kept}
                onClick={() => setKept((k) => !k)}
                className="-ml-1 inline-flex h-11 items-center rounded-md px-2 text-[0.875rem] font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
              >
                {kept ? "Not yet, actually" : "I kept it"}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  );
}

function Reply({ me }: { me: string }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="reply" className="sheet px-5 py-5">
      <h3 id="reply" className="font-display text-[1.6rem] leading-tight">
        One reply
      </h3>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            aria-live="polite"
          >
            <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
              <motion.span
                initial={reduce ? false : { scale: 1.7, rotate: -24, opacity: 0 }}
                animate={{ scale: 1, rotate: -6, opacity: 1 }}
                transition={{ duration: 0.55, ease: EASE }}
              >
                <PersonSeal initial={me} size={36} />
              </motion.span>
              <p className="text-[1.0625rem] leading-snug">{sent}</p>
            </div>
            <p className="mt-4 text-sm text-ink/70">Sealed. It opens next Sunday’s letter, word for word. That’s your one for this week.</p>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <label htmlFor="circle-reply" className="mt-1 block text-sm text-ink/65">
              It goes into next Sunday’s letter. No thread, no likes.
            </label>
            <textarea
              id="circle-reply"
              rows={3}
              maxLength={240}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nani, save me a bowl."
              className="writing ruled mt-3"
              style={{ ["--rule" as string]: "2rem" }}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[0.8125rem] tabular-nums text-ink/65">{240 - text.length} left</p>
              <Button onClick={() => setSent(text.trim())} disabled={!text.trim()}>
                Seal my reply
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** The demo's one dependency: the letter counts your Wednesday only once you've sealed it. */
function UnsealedNote({ onSeal }: { onSeal: () => void }) {
  return (
    <div className="rule mt-8 w-full max-w-md border-t pt-5 text-left">
      <p className="text-sm text-ink/70">
        In this demo you haven’t sealed Wednesday yet, so the letter will say three of you were tired. Seal tonight’s line first and it says four.
      </p>
      <Button variant="secondary" size="sm" className="mt-3 h-11" onClick={onSeal}>
        Seal my Wednesday line
      </Button>
    </div>
  );
}
