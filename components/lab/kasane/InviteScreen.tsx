"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef } from "react";
import { person, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { goToScreen, HoldSeal, scramble } from "./bits";
import { EASE, INVITE, MIRA_SIDE } from "./data";

export interface SideState {
  remember: string;
  unseen: string;
  keepUnseen: boolean;
  sealed: boolean;
}

const SEALED_TEXT = MIRA_SIDE.map(scramble);

export function InviteScreen({
  me,
  side,
  setSide,
  unfolded,
}: {
  me: Me;
  side: SideState;
  unfolded: boolean;
  setSide: (fn: (s: SideState) => SideState) => void;
}) {
  const reduce = useReducedMotion();
  const from = person(INVITE.from);
  const words = side.remember.trim() ? side.remember.trim().split(/\s+/).length : 0;

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12 lg:items-start">
      {/* The invitation, her side sealed */}
      <section aria-labelledby="invite-title" className="lg:sticky lg:top-6 lg:col-span-5">
        <div className="chapter rounded-xs p-[clamp(1.4rem,3.5vw,2rem)] shadow-paper">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink/65">
                From {from.first} · passed on {INVITE.passedOn}
              </p>
              <h2 id="invite-title" className="mt-2 font-display text-[clamp(1.9rem,1.6rem+1vw,2.4rem)] leading-[1.02]">
                {from.first} remembers something you were part of.
              </h2>
            </div>
            <PersonSeal initial={from.initial} size={46} className="-rotate-6" title={`${from.first}’s seal`} />
          </div>
          <p className="mt-5 text-lg text-ink/80">“{INVITE.note}”</p>

          <div className="rule mt-7 border-t pt-5">
            <p className="text-sm text-ink/65">
              {INVITE.day} · {INVITE.place}
            </p>
            <p className="mt-1 font-display text-[1.6rem] leading-tight">{INVITE.title}</p>
          </div>

          {/* Her side: a folded sheet, her ink showing through the back of the paper. */}
          <div className="relative mt-5 max-h-[13rem] overflow-hidden rounded-xs bg-surface shadow-paper lg:max-h-[17rem]">
            <div
              aria-hidden
              className="-scale-x-100 select-none space-y-3 p-5 text-[1.0625rem] leading-relaxed text-ink/30 blur-[1.2px]"
            >
              {SEALED_TEXT.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {/* The fold, and her seal pressed across it. */}
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-ink/15" />
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-6 bg-gradient-to-b from-ink/[0.06] to-transparent" />
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <PersonSeal
                initial={from.initial}
                size={50}
                className="-rotate-[8deg] bg-surface"
                title={unfolded ? `${from.first}’s side, opened` : `${from.first}’s side, sealed`}
              />
            </div>
          </div>
          <p className="mt-3 text-[0.9375rem] font-medium text-ink/85">
            {unfolded ? `${from.first}’s side is open.` : `${from.first}’s side is written, and sealed.`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/65">
            {unfolded
              ? "You read each other at the same moment. It’s in your Book of Us."
              : side.sealed
              ? `Both sides are in. It unfolds ${INVITE.unfoldsAt}, for both of you at once.`
              : `You’ll read it together, once yours is in. If you don’t write, it unfolds anyway ${INVITE.unfoldsAt}.`}
          </p>
        </div>
      </section>

      {/* Your side, written blind */}
      <article aria-labelledby="side-title" className="sheet px-[clamp(1.25rem,4.5vw,3rem)] pb-10 pt-8 lg:col-span-7">
        <header className="rule border-b pb-5">
          <p className="text-sm text-ink/65">Your side · {from.first} can’t see this until it unfolds</p>
          <h2 id="side-title" className="mt-1.5 font-display text-[clamp(2.1rem,1.7rem+1.6vw,2.9rem)] leading-[0.98]">
            Write your side of {INVITE.dayShort}
            <span className="block text-[0.55em] text-ink/65">October 24</span>
          </h2>
        </header>

        <div className="mt-8 space-y-10">
          <div>
            <label htmlFor="side-remember" className="block font-display text-prompt ">
              {INVITE.prompts[0].label}
            </label>
            <AutoText
              id="side-remember"
              value={side.remember}
              readOnly={side.sealed}
              onChange={(v) => setSide((s) => ({ ...s, remember: v }))}
              placeholder="Start anywhere. The smell, the street, what you were worried about."
            />
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <label htmlFor="side-unseen" className="block font-display text-prompt ">
                {INVITE.prompts[1].label}
              </label>
              <label className="relative -my-2 inline-flex min-h-11 cursor-pointer items-center gap-2.5 pr-1 text-[0.9375rem] text-ink/75">
                <input
                  type="checkbox"
                  checked={side.keepUnseen}
                  disabled={side.sealed}
                  onChange={(e) => setSide((s) => ({ ...s, keepUnseen: e.target.checked }))}
                  className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span
                  aria-hidden
                  className="grid h-5 w-5 place-items-center rounded-[4px] border border-ink/35 text-transparent transition-colors duration-300 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                >
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                Keep for myself
              </label>
            </div>
            <AutoText
              id="side-unseen"
              value={side.unseen}
              readOnly={side.sealed}
              onChange={(v) => setSide((s) => ({ ...s, unseen: v }))}
              placeholder="Optional. Something only you noticed."
            />
            <p className="mt-1 text-sm text-ink/65">
              {side.keepUnseen ? "This stays on your page. Mira and Kata’s preface won’t see it." : "This answer goes in your side."}
            </p>
          </div>
        </div>

        <div className="rule mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-5 border-t pt-6">
          <HoldSeal
            initial={me.initial}
            sealed={side.sealed}
            onSeal={() => setSide((s) => ({ ...s, sealed: true }))}
            label="Press and hold to seal your side"
          />
          <p className="text-sm tabular-nums text-ink/65" aria-live="polite">
            {words} {words === 1 ? "word" : "words"}
          </p>
        </div>

        <AnimatePresence initial={false}>
          {side.sealed ? (
            <motion.div
              key="sealed"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
              className="mt-6 flex flex-col gap-4 rounded-sm bg-ink/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-[0.9375rem] leading-relaxed text-ink/80">
                {unfolded
                  ? `It has unfolded. Both sides are open, for you and ${from.first}.`
                  : `Both sides are in. Kata will unfold them ${INVITE.unfoldsAt}, or you can open it now.`}
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button onClick={() => goToScreen("unfold")}>{unfolded ? "Read it again" : "Open it now"}</Button>
                {unfolded ? null : (
                  <Button variant="quiet" onClick={() => setSide((s) => ({ ...s, sealed: false }))}>
                    Withdraw
                  </Button>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </article>
    </div>
  );
}

/** A borderless writing field on ruled paper that grows with what you write. */
function AutoText({
  id,
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    // The screen may mount hidden; refit once it has a width.
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return;
      w = el.clientWidth;
      fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={2}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`writing ruled mt-2 block min-h-[4.25rem] ${readOnly ? "text-ink/80" : ""}`}
    />
  );
}
