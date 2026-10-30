"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { FieldPrompt } from "@/components/entry/FieldPrompt";
import { Button } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import { CAST, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Envelope } from "./Envelope";
import { HOLD_MS, HoldToSeal } from "./HoldToSeal";
import {
  BIRTHDAYS,
  DATE_PRESETS,
  EASE,
  GROUP_OPENS,
  KINDS,
  NOT_ON_KATA,
  OPEN_PROMISES,
  PROMISE_FALLBACK,
  TODAY,
  TODAYS_PAGE,
  countdown,
  dayMonth,
  longDate,
  weekday,
  type Capsule,
  type OpensKind,
} from "./data";

type Phase = "open" | "stamped" | "sealed";

export function SealSheet({ me, onSeal }: { me: Me; onSeal: (c: Capsule) => void }) {
  const reduce = useReducedMotion();
  const [label, setLabel] = useState(TODAYS_PAGE.label);
  const [note, setNote] = useState(TODAYS_PAGE.note);
  const [kind, setKind] = useState<OpensKind>("date");
  const [preset, setPreset] = useState("year");
  const [promise, setPromise] = useState(OPEN_PROMISES[0].id);
  const [personId, setPersonId] = useState("mira");
  const [group, setGroup] = useState<string[]>(["mira", "theo"]);
  const [groupName, setGroupName] = useState("The green door, year one");
  const [holding, setHolding] = useState(false);
  const [phase, setPhase] = useState<Phase>("open");
  const sealedCount = useRef(0);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const sealedRef = useRef<HTMLDivElement>(null);

  // On a phone the envelope lands above the fold: bring it into view.
  useEffect(() => {
    if (phase !== "sealed") return;
    const t = window.setTimeout(() => {
      const r = sealedRef.current?.getBoundingClientRect();
      if (r && (r.top < 64 || r.top > window.innerHeight * 0.6)) sealedRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

  useLayoutEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [note, phase]);

  const person = CAST.find((p) => p.id === personId)!;
  const promiseText = OPEN_PROMISES.find((p) => p.id === promise)!.text;
  const opensOn =
    kind === "date"
      ? DATE_PRESETS.find((p) => p.id === preset)!.iso
      : kind === "promise"
        ? PROMISE_FALLBACK
        : kind === "person"
          ? BIRTHDAYS[personId]
          : GROUP_OPENS;

  const opensLine =
    kind === "date"
      ? `Opens on ${longDate(opensOn)}`
      : kind === "promise"
        ? `Opens when “${promiseText}” is kept`
        : kind === "person"
          ? `Opens for ${person.first} on ${dayMonth(opensOn)}, their birthday`
          : `Opens for ${group.length + 1} of you on ${longDate(opensOn)}`;

  const opensDetail =
    kind === "promise"
      ? `If it isn’t kept, it opens anyway on ${longDate(PROMISE_FALLBACK)}.`
      : kind === "person"
        ? NOT_ON_KATA.has(personId)
          ? `${person.first} isn’t on Kata, so it arrives as a letter by email that morning.`
          : `It arrives with ${person.first}’s Sunday letter. Only ${person.first} can open it.`
        : kind === "group"
          ? "Each of you adds pages the others can’t see. It opens for everyone the same morning."
          : `${countdown(opensOn).replace(/^opens/, "It opens")}, with that week’s Sunday letter.`;

  function seal() {
    setPhase("stamped");
    sealedCount.current += 1;
    onSeal({
      id: `new-${sealedCount.current}`,
      label: label.trim() || "A page from today",
      kind,
      sealedOn: TODAY,
      opensOn,
      promise: kind === "promise" ? promiseText : undefined,
      to: kind === "person" ? person.first : undefined,
      byEmail: kind === "person" && NOT_ON_KATA.has(personId),
      contents: "1 page and a note",
      keepers:
        kind === "group"
          ? [
              { initial: me.initial, name: me.first, inked: true },
              ...group.map((id) => {
                const p = CAST.find((c) => c.id === id)!;
                return { initial: p.initial, name: p.first, inked: false };
              }),
            ]
          : undefined,
    });
    window.setTimeout(() => setPhase("sealed"), reduce ? 300 : 750);
  }

  const toggleGroup = (id: string) =>
    setGroup((g) => (g.includes(id) ? g.filter((x) => x !== id) : g.length >= 11 ? g : [...g, id]));

  const sealMotion = holding
    ? { opacity: 0.92, scale: reduce ? 1 : 1.07, rotate: reduce ? -8 : -12, y: reduce ? 0 : -4 }
    : phase === "open"
      ? // Same with or without reduced motion: it is invisible, and it must match the server render.
        { opacity: 0, scale: 1.7, rotate: -26, y: -18 }
      : { opacity: 1, scale: 1, rotate: -8, y: 0 };
  const sealTransition = holding
    ? { duration: reduce ? 0.2 : HOLD_MS / 1000, ease: EASE }
    : phase === "open"
      ? { duration: reduce ? 0 : 0.3, ease: EASE }
      : { duration: reduce ? 0.2 : 0.22, ease: EASE };

  return (
    // On phones the controls come first, so the page (and the spot where the seal lands)
    // sits right above the button you hold. On wide screens the page fills the left.
    <div className="grid grid-cols-1 gap-x-12 gap-y-9 lg:grid-cols-12 lg:grid-rows-[auto_1fr]">
      <div className={`order-2 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1 ${phase === "sealed" ? "order-1 lg:col-span-12" : "lg:col-span-7"}`}>
        <AnimatePresence mode="wait" initial={false}>
          {phase !== "sealed" ? (
            <motion.article
              key="page"
              aria-labelledby="seal-page-title"
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 12 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="sheet relative overflow-clip px-[clamp(1.25rem,4.5vw,2.75rem)] pb-32 pt-7 sm:pt-9"
            >
              <header className="rule flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-5">
                <h2 id="seal-page-title" className="font-display text-[clamp(2.4rem,1.9rem+2vw,3.4rem)] leading-[0.95]">
                  {weekday(TODAY)}
                </h2>
                <p className="text-sm text-ink/65">
                  {longDate(TODAY)} · page {TODAYS_PAGE.number}
                </p>
              </header>

              <div className="mt-7 space-y-8">
                <div className="space-y-2">
                  <FieldPrompt as="p">What’s on my mind?</FieldPrompt>
                  <p className="ruled text-prose text-ink/90">{TODAYS_PAGE.mind}</p>
                </div>
                <div className="space-y-2">
                  <FieldPrompt htmlFor="sealed-note">A note for whoever opens this</FieldPrompt>
                  <textarea
                    id="sealed-note"
                    ref={noteRef}
                    rows={3}
                    value={note}
                    disabled={phase !== "open"}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Dear me, a year from now…"
                    className="writing ruled block"
                  />
                </div>
              </div>

              <div aria-hidden className="absolute bottom-7 left-[clamp(1rem,4.5vw,2.5rem)] grid h-[72px] w-[72px] place-items-center">
                <span
                  className={`absolute inset-0 rounded-[19%] border border-dashed border-ink/25 transition-opacity duration-300 ${ phase === "open" && !holding ? "opacity-100" : "opacity-0"
                  }`}
                />
                <motion.span className="relative inline-block" initial={false} animate={sealMotion} transition={sealTransition}>
                  <Seal size={72} cut="surface" />
                </motion.span>
              </div>
              <p className="absolute bottom-9 left-[calc(clamp(1rem,4.5vw,2.5rem)+88px)] right-[clamp(1rem,4.5vw,2.5rem)] text-sm text-ink/65">
                {phase === "stamped" ? "Sealed." : holding ? "Pressing the seal…" : "The seal goes here."}
              </p>
            </motion.article>
          ) : (
            <motion.div
              key="sealed"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: EASE }}
              ref={sealedRef}
              className="mx-auto max-w-[34rem] scroll-mt-24 pt-2 lg:pt-8"
            >
              <Envelope seal={<Seal size={64} cut="surface" className="-rotate-6" />}>
                <p className="truncate text-center font-display text-[clamp(1.25rem,1rem+1.4vw,1.8rem)] leading-tight">{label.trim() || "A page from today"}</p>
                <p className="mt-1 text-center text-sm text-ink/65">Sealed by {me.first} · {longDate(TODAY)}</p>
              </Envelope>
              <div aria-live="polite" className="mt-9 text-center">
                <p className="font-display text-prompt">{opensLine}.</p>
                <p className="mx-auto mt-2 max-w-[28rem] text-ink/70">
                  It’s on your shelf now. Until then, not even you can reread it. You can still postpone it or cancel it.
                </p>
                <Button variant="secondary" className="mt-6" onClick={() => setPhase("open")}>
                  Seal another page
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section aria-labelledby="opens-heading" hidden={phase === "sealed"} className="order-1 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-1">
        <label htmlFor="envelope-label" className="block text-[0.9375rem] font-medium">
          On the envelope
        </label>
        <input
          id="envelope-label"
          value={label}
          disabled={phase !== "open"}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={48}
          className="control mt-2 font-display text-[1.35rem] "
        />

        <h2 id="opens-heading" className="mt-8 text-[0.9375rem] font-medium">
          When it opens
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {KINDS.map((k) => (
            <Choice key={k.id} card on={kind === k.id} disabled={phase !== "open"} onClick={() => setKind(k.id)}>
              <span className="block text-[0.9375rem] font-medium leading-snug">{k.label}</span>
              <span className="block text-[0.8125rem] text-ink/65">{k.hint}</span>
            </Choice>
          ))}
        </div>

        <div className="mt-5">
          {kind === "date" ? (
            <Options label="Choose a day">
              {DATE_PRESETS.map((p) => (
                <Choice key={p.id} on={preset === p.id} disabled={phase !== "open"} onClick={() => setPreset(p.id)}>
                  {p.label}
                </Choice>
              ))}
            </Options>
          ) : kind === "promise" ? (
            <Options label="Your open promises" column>
              {OPEN_PROMISES.map((p) => (
                <Choice key={p.id} row on={promise === p.id} disabled={phase !== "open"} onClick={() => setPromise(p.id)}>
                  <span aria-hidden className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border ${promise === p.id ? "border-ink" : "border-ink/35"}`}>
                    {promise === p.id ? <span className="h-2 w-2 rounded-[2px] bg-ink" /> : null}
                  </span>
                  {p.text}
                </Choice>
              ))}
            </Options>
          ) : kind === "person" ? (
            <Options label="Who it’s for">
              {CAST.map((p) => (
                <Choice key={p.id} on={personId === p.id} disabled={phase !== "open"} onClick={() => setPersonId(p.id)} withSeal>
                  <PersonSeal initial={p.initial} size={30} state={personId === p.id ? "inked" : "resting"} />
                  {p.first}
                </Choice>
              ))}
            </Options>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="group-name" className="block text-sm text-ink/70">
                  Name the capsule
                </label>
                <input id="group-name" value={groupName} disabled={phase !== "open"} onChange={(e) => setGroupName(e.target.value)} className="control mt-1.5" />
              </div>
              <Options label={`Who’s in it with you (${group.length + 1} of up to 12)`}>
                {CAST.filter((p) => !NOT_ON_KATA.has(p.id)).map((p) => {
                  const on = group.includes(p.id);
                  return (
                    <Choice key={p.id} on={on} disabled={phase !== "open"} onClick={() => toggleGroup(p.id)} withSeal>
                      <PersonSeal initial={p.initial} size={30} state={on ? "blank" : "resting"} />
                      {p.first}
                    </Choice>
                  );
                })}
              </Options>
            </div>
          )}
        </div>

      </section>

      <div hidden={phase === "sealed"} className="order-3 self-start lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-2">
        <div className="rule border-t pt-5">
          <p aria-live="polite" className="font-display text-[1.5rem] leading-tight">{opensLine}</p>
          <p className="mt-1.5 text-[0.9375rem] text-ink/70">{opensDetail}</p>
        </div>

        <div className="mt-6">
          <HoldToSeal
            holding={holding}
            onHoldChange={setHolding}
            onSealed={seal}
            disabled={phase !== "open" || (kind === "group" && group.length < 1)}
            describedBy="hold-hint"
          />
          <p id="hold-hint" className="mt-3 text-sm text-ink/65">
            Hold for a second. Once it’s sealed, it shows only as an envelope, even to you.
          </p>
        </div>
      </div>
    </div>
  );
}

function Options({ label, column, children }: { label: string; column?: boolean; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-ink/70">{label}</legend>
      <div className={column ? "grid grid-cols-1 gap-2" : "flex flex-wrap gap-2"}>{children}</div>
    </fieldset>
  );
}

function Choice({
  on,
  onClick,
  disabled,
  card,
  row,
  withSeal,
  className = "",
  children,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** A two-line tile. */
  card?: boolean;
  /** A full-width list row. */
  row?: boolean;
  /** A pill that starts with a person's seal. */
  withSeal?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const shape = card
    ? "flex min-h-[4.5rem] flex-col items-start justify-center rounded-md px-4 py-3 text-left"
    : row
      ? "flex min-h-12 w-full items-center gap-3 rounded-md px-4 py-2.5 text-left"
      : `inline-flex min-h-11 items-center gap-2.5 rounded-full ${withSeal ? "pl-1.5 pr-4" : "px-4"}`;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`${shape} border text-[0.9375rem] transition-colors duration-300 disabled:cursor-default ${ on ? "border-ink/80 bg-ink/[0.06] text-ink" : "border-ink/15 text-ink/75 hover:border-ink/40 hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}
