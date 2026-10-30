"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { person } from "@/components/lab/cast";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import type { CircleActions, CircleState } from "./CirclesPrototype";
import { CircleGlyph, EASE, LockGlyph, Mood } from "./bits";
import { CIRCLES, MOODS, SAMPLE, WEEKDAYS, WEEKDAY_NAMES, circleById, type Circle, type Offering } from "./data";
import { HoldSeal } from "./HoldSeal";

interface Target {
  circleId: string;
  personId: string;
  line: string;
}

export function Tonight({ state, actions }: { state: CircleState; actions: CircleActions }) {
  const [circleId, setCircleId] = useState("rao");
  const [target, setTarget] = useState<Target | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const circle = circleById(circleId);
  const { me, sealed } = state;

  const others = new Set(CIRCLES.flatMap((c) => c.members)).size;

  function closeSheet() {
    const key = target ? `${target.circleId}:${target.personId}` : null;
    setTarget(null);
    if (key) requestAnimationFrame(() => triggers.current[key]?.focus());
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h2 className="font-display text-display-m">Wednesday evening</h2>
          <p className="mt-2 text-ink/70">21 October. You follow two circles, not a feed.</p>
        </div>
        <div role="radiogroup" aria-label="Circle" className="inline-flex max-w-full rounded-md border border-ink/15 p-1">
          {CIRCLES.map((c) => {
            const on = c.id === circleId;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setCircleId(c.id);
                  setTarget(null);
                }}
                className={`h-11 rounded-sm px-4 text-[0.9375rem] transition-colors duration-300 ${ on ? "bg-ink text-ground" : "text-ink/70 hover:text-ink"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article aria-labelledby="row-title" className="sheet min-w-0 px-[clamp(1.1rem,4vw,2.75rem)] py-[clamp(1.4rem,4vw,2.5rem)]">
          <header className="rule border-b pb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 id="row-title" className="font-display text-[clamp(1.75rem,1.4rem+1.2vw,2.3rem)] leading-none">
                {circle.name}
              </h3>
              <p className="text-sm text-ink/65">
                {circle.members.length + 1} of 12 seats · {circle.since}
              </p>
            </div>
            <SealRow circle={circle} me={me.initial} sealed={sealed} />
            <WeekInk circle={circle} sealed={sealed} />
          </header>

          <ul className="divide-y divide-ink/10">
            <li className="py-6">
              <MyRow state={state} actions={actions} circle={circle} others={others} />
            </li>
            {circle.tonight.map((o) => {
              const key = `${circle.id}:${o.personId}`;
              return (
                <li key={key} className="py-6">
                  <OtherRow
                    offering={o}
                    note={sent[key]}
                    composing={target?.personId === o.personId && target.circleId === circle.id}
                    triggerRef={(el) => {
                      triggers.current[key] = el;
                    }}
                    onNote={() => o.line && setTarget({ circleId: circle.id, personId: o.personId, line: o.line })}
                  />
                </li>
              );
            })}
          </ul>
        </article>

        <aside aria-label="The margin" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <MarginSheet
            target={target}
            onClose={closeSheet}
            onSend={(text) => {
              if (!target) return;
              setSent((s) => ({ ...s, [`${target.circleId}:${target.personId}`]: text }));
              closeSheet();
            }}
          />
          <NotesForYou circle={circle} />
        </aside>
      </div>
    </div>
  );
}

/** The evening row: every member's seal, inked, blank or resting. */
function SealRow({ circle, me, sealed }: { circle: Circle; me: string; sealed: boolean }) {
  const reduce = useReducedMotion();
  return (
    <ul className="mt-6 flex flex-wrap gap-x-[clamp(0.6rem,2.4vw,1.5rem)] gap-y-4" aria-label="Tonight’s seals">
      <li className="flex w-12 flex-col items-center gap-1.5 sm:w-14">
        <span className="grid h-12 w-12 place-items-center">
          <AnimatePresence mode="wait" initial={false}>
            {sealed ? (
              <motion.span
                key="inked"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -26 }}
                animate={{ opacity: 1, scale: 1, rotate: -6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
              >
                <PersonSeal initial={me} size={44} state="inked" title="You, sealed" />
              </motion.span>
            ) : (
              <motion.span key="blank" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <PersonSeal initial={me} size={44} state="blank" title="You, not sealed yet" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="text-[0.8125rem] text-ink/70">You</span>
      </li>
      {circle.tonight.map((o) => {
        const p = person(o.personId);
        const label = o.state === "inked" ? "sealed" : o.state === "resting" ? "resting" : "not sealed yet";
        return (
          <li key={o.personId} className="flex w-12 flex-col items-center gap-1.5 sm:w-14">
            <span className="grid h-12 w-12 place-items-center">
              <PersonSeal initial={p.initial} size={44} state={o.state} title={`${p.first}, ${label}`} className={o.state === "inked" ? "-rotate-3" : ""} />
            </span>
            <span className="text-[0.8125rem] text-ink/70">{p.first}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Ink density by how many wrote each day. Never who. */
function WeekInk({ circle, sealed }: { circle: Circle; sealed: boolean }) {
  const size = circle.members.length + 1;
  // Tonight counts whoever has sealed so far, you included once you seal.
  const counts = circle.week.map((n, i) =>
    i === 2 ? circle.tonight.filter((o) => o.state === "inked").length + (sealed ? 1 : 0) : n
  );
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-sm text-ink/65">This week’s ink</p>
      <ol className="flex gap-1.5">
        {WEEKDAYS.map((d, i) => {
          const n = counts[i];
          const future = i > 2;
          return (
            <li key={d} className="flex flex-col items-center gap-1">
              <span
                className={`block h-5 w-5 rounded-[3px] ${future ? "border border-dashed border-ink/20" : "bg-ink"}`}
                style={future ? undefined : { opacity: 0.12 + (n / size) * 0.78 }}
                aria-hidden
              />
              <span className={`text-[0.75rem] ${i === 2 ? "font-medium text-ink" : "text-ink/65"}`}>{d[0]}</span>
              <span className="sr-only">
                {WEEKDAY_NAMES[i]}: {future ? "not yet" : `${n} of ${size} wrote`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MyRow({ state, actions, circle, others }: { state: CircleState; actions: CircleActions; circle: Circle; others: number }) {
  const reduce = useReducedMotion();
  const lineId = useId();
  const { me, sealed, fields, line, mood } = state;
  const lineField = fields.find((f) => f.kind === "line")!;
  const moodField = fields.find((f) => f.kind === "mood")!;
  const extra = fields.filter((f) => f.offered && f.kind !== "line" && f.kind !== "mood");
  const offeredLine = lineField.offered && line.trim();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sealed ? (
        <motion.div
          key="sealed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4"
        >
          <motion.span
            initial={reduce ? false : { scale: 1.7, rotate: -24, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
            className="mt-0.5"
          >
            <PersonSeal initial={me.initial} size={44} state="inked" />
          </motion.span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">You</span>
              <span className="text-sm text-ink/65">sealed 9:40 pm</span>
              {moodField.offered ? <Mood level={mood} /> : null}
            </p>
            {offeredLine ? (
              <p className="mt-1.5 text-[1.1875rem] leading-relaxed">{line.trim()}</p>
            ) : (
              <p className="mt-1.5 text-[1.0625rem] text-ink/65">Only your seal tonight.</p>
            )}
            <OfferedExtras kinds={extra.map((f) => f.kind)} />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm text-ink/65">Seen by {circle.members.length} here, {others} across your circles.</p>
              <Button variant="quiet" size="sm" className="-ml-3 h-11" onClick={() => actions.setSealed(false)}>
                Take it back
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="compose"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="rounded-xs bg-ground/70 p-[clamp(1rem,3vw,1.5rem)]"
        >
          <p className="text-sm text-ink/65">Your page tonight · everything is private until you seal it</p>
          {lineField.offered ? (
            <>
              <label htmlFor={lineId} className="mt-4 block font-display text-prompt text-ink/80">
                {lineField.label}
              </label>
              <textarea
                id={lineId}
                rows={2}
                value={line}
                maxLength={160}
                onChange={(e) => actions.setLine(e.target.value)}
                placeholder="One line. They’ll see it tonight."
                className="writing ruled mt-1"
                style={{ ["--rule" as string]: "2.1rem" }}
              />
            </>
          ) : (
            <p className="mt-4 text-[1.0625rem] text-ink/70">
              Your line is private, so only your seal goes to the circle.
            </p>
          )}
          {moodField.offered ? (
            <div className="mt-5">
              <p id="my-mood" className="text-sm text-ink/65">{moodField.label}</p>
              <div role="radiogroup" aria-labelledby="my-mood" className="mt-2 flex flex-wrap gap-1">
                {MOODS.map((e, i) => {
                  const on = mood === i + 1;
                  return (
                    <button
                      key={e}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`Mood ${i + 1} of 5`}
                      onClick={() => actions.setMood(i + 1)}
                      className={`grid h-11 w-11 place-items-center rounded-full text-[1.3rem] transition-[opacity,box-shadow] duration-300 ${ on ? "bg-surface shadow-[0_0_0_1.5px_var(--ink)]" : "opacity-45 hover:opacity-100"
                      }`}
                    >
                      <span aria-hidden>{e}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <OfferedExtras kinds={extra.map((f) => f.kind)} />
          <div className="rule mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t pt-5">
            <HoldSeal initial={me.initial} onSealed={() => actions.setSealed(true)} />
            <p className="flex items-center gap-2 text-sm text-ink/65">
              <CircleGlyph />
              Goes to {others} people in 2 circles
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Any other fields you chose to offer, as they'd read in the row. */
function OfferedExtras({ kinds }: { kinds: string[] }) {
  if (!kinds.length) return null;
  return (
    <div className="mt-3 space-y-2 text-[0.9375rem] text-ink/80">
      {kinds.includes("long") ? <p className="">{SAMPLE.drained}</p> : null}
      {kinds.includes("promises") ? (
        <ul className="space-y-1">
          {SAMPLE.promises.map((p) => (
            <li key={p.text} className="flex items-center gap-2">
              <Icon name="check" className={`h-4 w-4 ${p.done ? "text-ink" : "text-ink/30"}`} />
              <span className={p.done ? "" : "text-ink/70"}>{p.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {kinds.includes("number") ? <p>{SAMPLE.sleep} hours slept</p> : null}
    </div>
  );
}

function OtherRow({
  offering,
  note,
  composing,
  onNote,
  triggerRef,
}: {
  offering: Offering;
  note?: string;
  composing: boolean;
  onNote: () => void;
  triggerRef: (el: HTMLButtonElement | null) => void;
}) {
  const p = person(offering.personId);
  const reduce = useReducedMotion();

  if (offering.state !== "inked") {
    return (
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
        <PersonSeal initial={p.initial} size={44} state={offering.state} />
        <p>
          <span className="font-medium">{p.first}</span>
          <span className="ml-3 text-sm text-ink/65">{offering.state === "resting" ? "Resting tonight" : "No seal yet tonight"}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
      <PersonSeal initial={p.initial} size={44} state="inked" className="mt-0.5 -rotate-3" />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-medium">{p.first}</span>
          <Mood level={offering.mood} />
          <span className="inline-flex basis-full items-center gap-1.5 text-sm text-ink/65 sm:basis-auto sm:pl-1">
            {offering.byEmail ? <Icon name="letter" className="h-4 w-4" /> : null}
            {offering.byEmail ? "by email · " : ""}
            {offering.when}
          </span>
        </p>
        <p className="mt-1.5 text-[1.1875rem] leading-relaxed">{offering.line}</p>
        <AnimatePresence initial={false}>
          {note ? (
            <motion.div
              key="note"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-3 max-w-[26rem] rounded-xs bg-raised/70 px-4 py-3"
            >
              <p className="text-[1rem] leading-snug">{note}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-ink/65">
                <LockGlyph className="h-3.5 w-3.5" />
                Tucked in the margin · only {p.first} sees it
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {!note ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={onNote}
            aria-expanded={composing}
            className={`-ml-3 mt-1.5 inline-flex h-11 items-center gap-2 rounded-md px-3 text-[0.875rem] transition-colors duration-300 ${ composing ? "bg-ink/[0.06] text-ink" : "text-ink/70 hover:bg-ink/[0.05] hover:text-ink"
            }`}
          >
            <Icon name="pen" className="h-4 w-4" />
            Tuck a note in {p.first}’s margin
          </button>
        ) : null}
      </div>
    </div>
  );
}

const DESK = "(min-width: 64rem)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(DESK);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const noop = () => () => {};
const useDesktop = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(DESK).matches, () => false);

/** One private note beside someone's line. A sheet from below on phones, the margin on desktop. */
function MarginSheet({ target, onClose, onSend }: { target: Target | null; onClose: () => void; onSend: (text: string) => void }) {
  const reduce = useReducedMotion();
  const desk = useDesktop();
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  const from = reduce ? { opacity: 0 } : desk ? { opacity: 0, x: 16 } : { opacity: 0, y: "100%" };

  const sheet = (
    <AnimatePresence>
      {target ? (
        <motion.div
          key="scrim"
          aria-hidden
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="chapter fixed inset-0 z-40 lg:hidden"
        />
      ) : null}
      {target ? (
        <motion.div
          key={`${target.circleId}:${target.personId}`}
          role="dialog"
          aria-modal={desk ? undefined : true}
          aria-labelledby="margin-title"
          initial={from}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={from}
          transition={{ duration: 0.45, ease: EASE }}
          className="sheet fixed inset-x-0 bottom-0 z-50 max-h-[85svh] overflow-y-auto rounded-b-none px-margin pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 lg:static lg:z-auto lg:mb-8 lg:max-h-none lg:rounded-xs lg:px-6 lg:pb-6"
        >
          <MarginBody target={target} onClose={onClose} onSend={onSend} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
  // On phones the sheet leaves the page's stacking context so it covers the header and tab bar.
  return desk ? sheet : mounted ? createPortal(sheet, document.body) : null;
}

function MarginBody({ target, onClose, onSend }: { target: Target; onClose: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const p = person(target.personId);

  useEffect(() => {
    const t = setTimeout(() => area.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="margin-title" className="font-display text-[1.6rem] leading-tight">
            In {p.first}’s margin
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/65">
            <LockGlyph className="h-3.5 w-3.5" />
            Only {p.first} will see this
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the margin"
          className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink/65 hover:bg-ink/[0.05] hover:text-ink"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      <blockquote className="rule mt-4 border-l-2 pl-3 text-[1rem] leading-snug text-ink/75">{target.line}</blockquote>
      <label htmlFor="margin-note" className="sr-only">
        Your note for {p.first}
      </label>
      <textarea
        id="margin-note"
        ref={area}
        rows={3}
        value={text}
        maxLength={200}
        onChange={(e) => setText(e.target.value)}
        placeholder={target.personId === "nani" ? "Save me a bowl." : "Write it small."}
        className="writing ruled mt-4"
        style={{ ["--rule" as string]: "2rem" }}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/65">One note per line. It never becomes a thread.</p>
        <Button onClick={() => onSend(text.trim())} disabled={!text.trim()}>
          Tuck it in
        </Button>
      </div>
    </>
  );
}

function NotesForYou({ circle }: { circle: Circle }) {
  return (
    <section aria-labelledby="your-margin">
      <h3 id="your-margin" className="font-display text-[1.6rem] leading-tight">
        In your margin
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/65">
        <LockGlyph className="h-3.5 w-3.5" />
        Notes beside your lines. Only you see them.
      </p>
      <ul className="mt-5 space-y-4">
        {circle.notesForYou.map((n) => {
          const p = person(n.from);
          return (
            <li key={n.from + n.beside} className="rounded-xs bg-raised/60 px-4 py-3.5">
              <p className="text-[1.0625rem] leading-snug">{n.text}</p>
              <p className="mt-2 flex items-center gap-2 text-[0.8125rem] text-ink/65">
                <PersonSeal initial={p.initial} size={20} />
                {p.first}, beside your {n.beside} line
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
