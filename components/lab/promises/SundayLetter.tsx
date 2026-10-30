"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { Me } from "@/components/lab/cast";
import { person } from "@/components/lab/cast";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { LETTER } from "./data";
import { EASE } from "./HoldSeal";
import { SignedCard } from "./People";

export function SundayLetter({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [answer, setAnswer] = useState<"accepted" | "declined" | null>(null);
  const k = LETTER.kept;

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <article aria-labelledby="letter-title" className="sheet min-w-0 px-[clamp(1.25rem,5vw,3.75rem)] py-[clamp(1.75rem,5vw,3.5rem)]">
        <header className="rule flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b pb-5">
          <h2 id="letter-title" className="font-display text-[clamp(1.9rem,1.5rem+1.4vw,2.6rem)] leading-none">
            {LETTER.range}
          </h2>
          <p className="text-sm text-ink/65">Sunday letter · one section of it</p>
        </header>

        <div className="mt-7 max-w-[38rem]">
          <h3 className="font-display text-[1.9rem] leading-tight">On your promises</h3>
          <p className="mt-4 text-prose">Dear {me.first},</p>
          <p className="mt-4 text-prose">{LETTER.opening}</p>
        </div>

        {/* The one sentence the letter exists for, with its evidence underneath. */}
        <figure className="mt-9 max-w-[40rem]">
          <blockquote className="font-display text-[clamp(1.7rem,1.25rem+1.8vw,2.5rem)] leading-[1.1]">
            You kept {LETTER.shared.kept} of the {LETTER.shared.of} promises you shared, and {LETTER.private.kept} of the {LETTER.private.of} you kept to yourself.{" "}
            <span className="text-accent">The ones you say out loud, you do.</span>
          </blockquote>
          <div className="mt-7 space-y-5">
            <Tally label="Said out loud" kept={LETTER.shared.kept} of={LETTER.shared.of} />
            <Tally label="Kept to yourself" kept={LETTER.private.kept} of={LETTER.private.of} />
          </div>
          <figcaption className="mt-4 text-sm text-ink/65">
            Filled squares were kept. {LETTER.released} more were released with a reason; they aren’t counted either way.
          </figcaption>
        </figure>

        <section aria-labelledby="kept-title" className="mt-12">
          <h3 id="kept-title" className="text-prose">
            One I’d frame: {k.line.charAt(0).toLowerCase() + k.line.slice(1)}
          </h3>
          <div className="mt-4">
            <SignedCard
              animate={false}
              text={k.text}
              day={k.day}
              carried={k.carried}
              signers={[
                { initial: me.initial, name: me.first, inked: true, note: "your seal" },
                ...k.witnesses.map((w) => ({ initial: person(w).initial, name: person(w).first, inked: true, note: `from ${person(w).city}` })),
              ]}
            />
          </div>
        </section>

        <section aria-labelledby="next-title" className="mt-12 rounded-xs border border-dashed border-ink/25 px-[clamp(1.1rem,3.5vw,2rem)] py-6">
          <h3 id="next-title" className="text-sm text-ink/65">
            One promise for next week, if you want it
          </h3>
          <p className="mt-2 font-display text-[clamp(1.6rem,1.3rem+1.2vw,2.1rem)] leading-[1.1]">
            {LETTER.suggestion.text}, by {LETTER.suggestion.by}
          </p>
          <p className="mt-2 max-w-[34rem] text-[0.9375rem] text-ink/75">{LETTER.suggestion.why}</p>
          <AnimatePresence mode="wait" initial={false}>
            {answer ? (
              <motion.div
                key="answered"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <p className="inline-flex items-center gap-2 text-[0.9375rem]" aria-live="polite">
                  {answer === "accepted" ? (
                    <>
                      <Icon name="check" className="h-4 w-4" />
                      Written on Monday’s page. No witness unless you add one.
                    </>
                  ) : (
                    "Left in the letter. Kata won’t suggest it again."
                  )}
                </p>
                <Button variant="quiet" size="md" className="-ml-3" onClick={() => setAnswer(null)}>
                  Undo
                </Button>
              </motion.div>
            ) : (
              <motion.div key="ask" initial={false} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => setAnswer("accepted")}>Put it on Monday’s page</Button>
                <Button variant="quiet" onClick={() => setAnswer("declined")}>
                  Not this one
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <footer className="mt-12 flex items-end justify-between gap-4">
          <p className="font-display text-[1.75rem] leading-none">— Kata</p>
          <Seal size={52} cut="surface" className="-rotate-6" />
        </footer>
      </article>

      <aside className="space-y-8 lg:pt-4">
        <section>
          <h3 className="font-medium">What the letter notices</h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
            Patterns, not scores. Kata compares you only with yourself, and only to say something useful.
          </p>
        </section>
        <section>
          <h3 className="font-medium">What it never says</h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
            How many you missed, or who you let down. Released promises appear only as a number, and only if you want them to.
          </p>
        </section>
      </aside>
    </div>
  );
}

function Tally({ label, kept, of }: { label: string; kept: number; of: number }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <p className="text-[0.9375rem] text-ink/80">
        {label} <span className="whitespace-nowrap tabular-nums text-ink/65">· {kept} of {of}</span>
      </p>
      <div role="img" aria-label={`${kept} of ${of} kept`} className="flex flex-wrap gap-1 sm:gap-[5px]">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-[3px] sm:h-[18px] sm:w-[18px] ${i < kept ? "bg-ink/75" : "border border-ink/30"}`} />
        ))}
      </div>
    </div>
  );
}
