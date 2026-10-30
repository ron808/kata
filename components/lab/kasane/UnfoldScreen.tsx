"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { person, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { goToScreen, JointSeal, useWide } from "./bits";
import { EASE, INVITE, KYOTO, MEETS, MIRA_KEPT, MIRA_SIDE, PREFACE } from "./data";
import type { SideState } from "./InviteScreen";

export interface UnfoldState {
  unfolded: boolean;
  kept: boolean;
}

/** Each pen gets its own paper, so the layers read apart when they overlap. */
const PAPERS = [
  "bg-[color-mix(in_oklab,var(--surface)_92%,transparent)]",
  "bg-[color-mix(in_oklab,color-mix(in_oklab,var(--surface)_55%,var(--raised))_90%,transparent)]",
  "bg-[color-mix(in_oklab,color-mix(in_oklab,var(--surface)_25%,var(--raised))_90%,transparent)]",
  "bg-[color-mix(in_oklab,color-mix(in_oklab,var(--surface)_75%,var(--raised))_90%,transparent)]",
];

export function UnfoldScreen({
  me,
  side,
  setSide,
  state,
  setState,
}: {
  me: Me;
  side: SideState;
  setSide: (fn: (s: SideState) => SideState) => void;
  state: UnfoldState;
  setState: (fn: (s: UnfoldState) => UnfoldState) => void;
}) {
  const [which, setWhich] = useState<"alfama" | "kyoto">("alfama");
  return (
    <div>
      <div role="group" aria-label="Which Kasane" className="inline-flex max-w-full rounded-md border border-ink/15 p-1">
        {(
          [
            ["alfama", "Alfama · two pens"],
            ["kyoto", "Kyoto · four pens"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={which === id}
            onClick={() => setWhich(id)}
            className={`h-11 rounded-sm px-4 text-[0.9375rem] transition-colors duration-300 ${ which === id ? "bg-ink text-ground" : "text-ink/70 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {which === "alfama" ? (
          <Alfama me={me} side={side} setSide={setSide} state={state} setState={setState} />
        ) : (
          <Kyoto me={me} />
        )}
      </div>
    </div>
  );
}

function Alfama({
  me,
  side,
  setSide,
  state,
  setState,
}: {
  me: Me;
  side: SideState;
  setSide: (fn: (s: SideState) => SideState) => void;
  state: UnfoldState;
  setState: (fn: (s: UnfoldState) => UnfoldState) => void;
}) {
  const reduce = useReducedMotion();
  const wide = useWide();
  const mira = person(INVITE.from);
  const [settled, setSettled] = useState(false);

  // Kata marks where the pages meet once both layers have come to rest.
  useEffect(() => {
    if (!state.unfolded) return;
    const t = window.setTimeout(() => setSettled(true), reduce ? 0 : 2000);
    return () => {
      window.clearTimeout(t);
      setSettled(false);
    };
  }, [state.unfolded, reduce]);
  const mine = side.remember.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const unseen = side.unseen.trim();

  function unfold() {
    if (!side.sealed) setSide((s) => ({ ...s, sealed: true }));
    setState((s) => ({ ...s, unfolded: true }));
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!state.unfolded ? (
        <motion.section
          key="folded"
          aria-labelledby="packet-title"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, rotateX: 58, y: -24, transformPerspective: 1100 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ transformOrigin: "50% 0%" }}
          className="grid grid-cols-1 gap-x-14 gap-y-12 pb-6 lg:grid-cols-12 lg:items-center"
        >
          <div className="relative w-full max-w-[34rem] lg:col-span-7 lg:justify-self-center">
            {/* The two layers inside, peeking out under the fold. */}
            <div aria-hidden className="sheet absolute inset-x-6 -bottom-6 top-8 rotate-[2.2deg]" />
            <div aria-hidden className={`absolute inset-x-3 -bottom-3 top-4 -rotate-[1.4deg] rounded-xs border border-ink/[0.07] shadow-paper ${PAPERS[1]}`} />
            <div className="chapter relative rounded-xs p-[clamp(1.5rem,5vw,2.5rem)] shadow-paper">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink/65">
                    {INVITE.day} · two pens
                  </p>
                  <h2 id="packet-title" className="mt-2 font-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-[1]">
                    {INVITE.title}
                  </h2>
                </div>
                <JointSeal
                  a={mira.initial}
                  b={me.initial}
                  bState={side.sealed ? "inked" : "blank"}
                  size={40}
                  title={side.sealed ? `Sealed by ${mira.first} and you` : `Sealed by ${mira.first}; yours is not yet`}
                />
              </div>
              <ul className="rule mt-7 space-y-3 border-t pt-5 text-[0.9375rem]">
                <li className="flex items-center gap-3">
                  <PersonSeal initial={mira.initial} size={26} />
                  <span className="text-ink/80">{mira.first} wrote hers on Monday, blind</span>
                </li>
                <li className="flex items-center gap-3">
                  <PersonSeal initial={me.initial} size={26} state={side.sealed ? "inked" : "blank"} />
                  <span className="text-ink/80">
                    {side.sealed ? "You wrote yours today, blind" : "Your side is still a draft"}
                  </span>
                </li>
              </ul>
              <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink/70">
                {side.sealed
                  ? `Both sides are in. It unfolds for you both at the same moment, ${INVITE.unfoldsAt}.`
                  : `It unfolds once you seal your side, or ${INVITE.unfoldsAt} whatever happens.`}
              </p>
              <Button size="lg" onClick={unfold} className="mt-6 w-full sm:w-auto">
                {side.sealed ? "Unfold it now" : "Seal my draft and unfold"}
              </Button>
            </div>
          </div>
          <aside aria-label="What happens at the unfold" className="lg:col-span-5">
            <h3 className="font-display text-[1.6rem] leading-tight">What happens when it opens</h3>
            <ol className="mt-5 space-y-5">
              {[
                ["Both layers open at once.", `You and ${mira.first} read each other at the same moment. Nobody goes first.`],
                ["Kata writes two lines, once.", "Where your memories meet and where they part. Never who was right."],
                ["It stays between you.", "It goes in your Book of Us, and either of you can withdraw your layer."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="w-5 shrink-0 font-display text-[1.6rem] leading-none tabular-nums text-ink/55">{i + 1}</span>
                  <p className="text-[0.9375rem] leading-relaxed text-ink/75">
                    <span className="block font-medium text-ink">{title}</span>
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </aside>
        </motion.section>
      ) : (
        <motion.section
          key="open"
          aria-labelledby="open-title"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <header className="flex items-start justify-between gap-x-5">
            <div className="min-w-0">
              <p className="text-ink/65">
                {INVITE.day} · {INVITE.place} · unfolded just now
              </p>
              <h2 id="open-title" className="mt-1.5 font-display text-display-m">
                {INVITE.title}
              </h2>
            </div>
            <motion.span
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: -14 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, delay: reduce ? 0 : 0.05, ease: EASE }}
              className="mt-1 inline-block"
            >
              <JointSeal a={mira.initial} b={me.initial} size={wide ? 44 : 32} title={`Sealed by ${mira.first} and you`} />
            </motion.span>
          </header>

          <Preface delay={reduce ? 0 : 1.7} lines={PREFACE} marks />

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 lg:items-start">
            <Layer index={0} delay={0.55} reduce={!!reduce} from={wide ? { x: "26%", y: 28, rotate: 1.2 } : { y: 0, rotate: 0.8 }} className="relative z-0">
              <LayerHead initial={me.initial} name="Your side" meta="Written today, blind" />
              <div className="mt-5 space-y-4 text-prose">
                {mine.length ? (
                  mine.map((p, i) => <p key={i}>{marked(p, MEETS.mine, settled)}</p>)
                ) : (
                  <p className="text-ink/65">You left this side blank.</p>
                )}
              </div>
              {unseen && !side.keepUnseen ? (
                <div className="mt-6">
                  <p className="font-display text-[1.2rem] text-ink/70">Something nobody else saw</p>
                  <p className="mt-1 text-prose">{unseen}</p>
                </div>
              ) : null}
              {unseen && side.keepUnseen ? <p className="mt-6 text-sm text-ink/65">You kept one answer for yourself.</p> : null}
            </Layer>
            <Layer
              index={1}
              delay={0.55}
              reduce={!!reduce}
              from={wide ? { x: "-70%", y: -28, rotate: -1.4 } : { y: "-92%", rotate: -1 }}
              className="relative z-10 -mt-4 ml-4 lg:-ml-10 lg:mt-14"
            >
              <LayerHead initial={mira.initial} name={`${mira.first}’s side`} meta="Written Monday, blind" />
              <div className="mt-5 space-y-4 text-prose">
                {MIRA_SIDE.map((p, i) => (
                  <p key={i}>{marked(p, MEETS.theirs, settled)}</p>
                ))}
              </div>
              <p className="mt-6 text-sm text-ink/65">{MIRA_KEPT}</p>
            </Layer>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 2.1, ease: EASE }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            {state.kept ? (
              <>
                <p className="inline-flex min-h-11 items-center gap-2 font-medium" aria-live="polite">
                  <Icon name="check" className="h-5 w-5" />
                  In your Book of Us with {mira.first}
                </p>
                <Button variant="secondary" onClick={() => goToScreen("people")}>
                  Open the Book of Us
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={() => setState((s) => ({ ...s, kept: true }))}>
                Keep it in our Book of Us
              </Button>
            )}
            <Button variant="quiet" onClick={() => setState(() => ({ unfolded: false, kept: false }))}>
              Fold it again
            </Button>
            <p className="text-sm text-ink/65 sm:ml-auto">Either of you can withdraw your layer at any time.</p>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function Kyoto({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const offsets = ["", "xl:mt-10", "xl:mt-3", "xl:mt-14"];
  const nudges = ["", "-mt-3 ml-3 sm:ml-0 sm:mt-0", "-mt-3 mr-3 sm:mr-0 sm:mt-0", "-mt-3 ml-3 sm:ml-0 sm:mt-0"];
  return (
    <section aria-labelledby="kyoto-title">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-ink/65">
            {KYOTO.day} · {KYOTO.place} · {KYOTO.unfolded}
          </p>
          <h2 id="kyoto-title" className="mt-1.5 font-display text-display-m">
            Kyoto, day three
          </h2>
        </div>
        <span className="flex -space-x-2" role="img" aria-label="Sealed by Theo, Lena, Kenji and you">
          {KYOTO.sides.map((s, i) => (
            <PersonSeal
              key={s.who}
              initial={s.who === "me" ? me.initial : person(s.who).initial}
              size={34}
              className={i % 2 ? "rotate-[5deg] bg-ground" : "-rotate-[5deg] bg-ground"}
            />
          ))}
        </span>
      </header>

      <Preface delay={0} lines={KYOTO.preface} />

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4 xl:gap-0">
        {KYOTO.sides.map((s, i) => {
          const isMe = s.who === "me";
          const p = isMe ? null : person(s.who);
          return (
            <Layer
              key={s.who}
              index={i}
              delay={0.08 * i}
              reduce={!!reduce}
              compact
              className={`relative ${nudges[i]} ${offsets[i]} ${i ? "xl:-ml-5" : ""}`}
              style={{ zIndex: i }}
            >
              <LayerHead initial={isMe ? me.initial : p!.initial} name={isMe ? "Your side" : `${p!.first}’s side`} meta={s.when} />
              <p className="mt-4 text-[1.0625rem] leading-[1.65]">{s.text}</p>
            </Layer>
          );
        })}
      </div>
    </section>
  );
}

function Preface({ lines, delay, marks }: { lines: string[]; delay: number; marks?: boolean }) {
  return (
    <motion.aside
      aria-label="Kata’s preface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className="rule mt-8 flex items-start gap-4 border-y py-5"
    >
      <Seal size={34} cut="ground" className="mt-1 -rotate-6" />
      <div className="min-w-0">
        <p className="max-w-[44rem] text-lede text-ink/90">
          {lines.map((l, i) => (
            <span key={i} className="block">
              {l}
            </span>
          ))}
        </p>
        <p className="mt-2 text-sm text-ink/65">
          Kata’s preface, written once at the unfold. It never says who was right.
          {marks ? (
            <>
              {" "}
              The <span className="underline decoration-accent decoration-[1.5px] underline-offset-[5px]">red underlines</span> are where your pages meet.
            </>
          ) : null}
        </p>
      </div>
    </motion.aside>
  );
}

function Layer({
  index,
  delay,
  reduce,
  compact,
  from,
  className = "",
  style,
  children,
}: {
  index: number;
  delay: number;
  reduce: boolean;
  compact?: boolean;
  /** Where the layer starts: lying on the others, before it slides out. */
  from?: { x?: number | string; y?: number | string; rotate?: number };
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const start = from ?? (index % 2 ? { x: -36, y: 26, rotate: -2.4 } : { x: 36, y: 26, rotate: 2 });
  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 0, y: 0, ...start }}
      animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      transition={
        reduce
          ? { duration: 0.3 }
          : { default: { duration: 1.1, delay, ease: EASE }, opacity: { duration: 0.35, delay: from ? 0 : delay, ease: EASE } }
      }
      style={style}
      className={`${PAPERS[index % PAPERS.length]} rounded-xs border border-ink/[0.07] shadow-paper backdrop-blur-[3px] ${ compact ? "px-6 pb-8 pt-6" : "px-[clamp(1.25rem,4vw,3rem)] pb-10 pt-7"
      } ${className}`}
    >
      {children}
    </motion.article>
  );
}

function LayerHead({ initial, name, meta }: { initial: string; name: string; meta: string }) {
  return (
    <div className="rule flex items-center gap-3 border-b pb-4">
      <PersonSeal initial={initial} size={34} className="-rotate-6" />
      <div className="min-w-0">
        <h3 className="font-display text-[1.45rem] leading-none">{name}</h3>
        <p className="mt-1 text-sm text-ink/65">{meta}</p>
      </div>
    </div>
  );
}

/** Underline the phrases where two pages say the same thing. */
function marked(text: string, phrases: string[], on: boolean): ReactNode {
  const hits = phrases
    .map((ph) => ({ ph, i: text.toLowerCase().indexOf(ph.toLowerCase()) }))
    .filter((h) => h.i >= 0)
    .sort((a, b) => a.i - b.i);
  if (!hits.length) return text;
  const out: ReactNode[] = [];
  let at = 0;
  for (const { ph, i } of hits) {
    if (i < at) continue;
    out.push(text.slice(at, i));
    out.push(
      <mark
        key={i}
        className={`bg-transparent text-inherit underline decoration-[1.5px] underline-offset-[5px] transition-[text-decoration-color] duration-700 ${ on ? "decoration-accent" : "decoration-transparent"
        }`}
      >
        {text.slice(i, i + ph.length)}
      </mark>,
    );
    at = i + ph.length;
  }
  out.push(text.slice(at));
  return out;
}
