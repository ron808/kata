"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { CAST, person, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { goToScreen, listNames } from "./bits";
import { EASE, PAGE, PASS_TITLE } from "./data";

export interface PassState {
  selected: string[];
  people: string[];
  note: string;
  passed: boolean;
}

export function PassScreen({
  me,
  state,
  setState,
}: {
  me: Me;
  state: PassState;
  setState: (fn: (s: PassState) => PassState) => void;
}) {
  const reduce = useReducedMotion();
  const [todos, setTodos] = useState(PAGE.todos);
  const { selected, people, note, passed } = state;
  const sender = me.first === "You" ? "A friend" : me.first;

  const chosen = PAGE.passages.filter((p) => selected.includes(p.id));
  const named = [...new Set(chosen.flatMap((p) => p.named))];
  const others = CAST.filter((p) => !named.includes(p.id));
  const names = people.map((id) => person(id).first);

  function togglePassage(id: string) {
    if (passed) return;
    setState((s) => ({
      ...s,
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    }));
  }

  function togglePerson(id: string) {
    setState((s) => ({
      ...s,
      people: s.people.includes(id) ? s.people.filter((x) => x !== id) : [...s.people, id],
    }));
  }

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12 lg:items-start">
      {/* The private page */}
      <article aria-labelledby="pass-page-title" className="sheet relative lg:col-span-7">
        <div className="px-[clamp(1.25rem,4.5vw,3rem)] pb-10 pt-8">
          <header className="rule flex items-end justify-between gap-4 border-b pb-5">
            <div>
              <p className="text-sm text-ink/65">Page {PAGE.number} · private</p>
              <h2 id="pass-page-title" className="mt-1.5 font-display text-[clamp(2.3rem,1.9rem+1.6vw,3.1rem)] leading-[0.95]">
                {PAGE.weekday}
                <span className="block text-[0.55em] text-ink/65">{PAGE.monthDay}</span>
              </h2>
            </div>
            <Seal size={40} cut="surface" className="-rotate-[8deg]" title="Written" />
          </header>

          <p className="mt-7 font-display text-prompt text-ink/75">{PAGE.prompt}</p>
          <p id="pass-hint" className="mt-2 text-sm text-ink/65">
            {passed ? "The marked lines have been passed on. Everything else stays on your page." : "Tap the lines you want to pass on. Everything else stays yours."}
          </p>
          <div className="ruled mt-3 text-prose">
            {PAGE.passages.map((p) => {
              const on = selected.includes(p.id);
              return (
                <span key={p.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-describedby="pass-hint"
                    disabled={passed && !on}
                    onClick={() => togglePassage(p.id)}
                    className={`inline rounded-[2px] text-left transition-colors duration-300 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] disabled:cursor-default disabled:opacity-100 ${ on ? "bg-[color-mix(in_oklab,var(--accent)_20%,transparent)] text-ink"
                        : "text-ink/85 hover:bg-ink/[0.05]"
                    }`}
                  >
                    {p.text}
                  </button>{" "}
                </span>
              );
            })}
          </div>

          <div className="mt-9">
            <p className="font-display text-prompt text-ink/75">{PAGE.todoPrompt}</p>
            <ul className="mt-2">
              {todos.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-pressed={t.done}
                    onClick={() => setTodos((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                    className="group flex min-h-11 w-full items-center gap-3 rounded-sm text-left"
                  >
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border transition-colors duration-300 ${ t.done ? "border-ink bg-ink text-ground" : "border-ink/35 group-hover:border-ink/60"
                      }`}
                    >
                      {t.done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
                    </span>
                    <span
                      className={`text-lg decoration-ink/50 decoration-1 transition-colors duration-300 ${ t.done ? "text-ink/65 line-through" : "text-ink/90"
                      }`}
                    >
                      {t.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-0.5" aria-label={`Energy ${PAGE.energy} of 5`} role="img">
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name="bolt" filled={n <= PAGE.energy} strokeWidth={1.4} className={`h-[1.1rem] w-[1.1rem] ${n <= PAGE.energy ? "" : "text-ink/40"}`} />
              ))}
            </div>
            <div className="flex gap-1.5">
              {PAGE.tags.map((t) => (
                <span key={t} className="rounded-sm bg-ink/[0.06] px-2 py-0.5 text-[0.8125rem] text-ink/70">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>

      {/* The pass sheet */}
      <section aria-labelledby="pass-sheet-title" className="lg:sticky lg:top-6 lg:col-span-5">
        <div className="rounded-md border border-ink/12 bg-surface p-[clamp(1.25rem,3.5vw,1.75rem)] shadow-paper">
          <h2 id="pass-sheet-title" className="font-display text-[1.9rem] leading-none">
            Pass to someone who was there
          </h2>

          <AnimatePresence mode="wait" initial={false}>
            {passed ? (
              <motion.div
                key="passed"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="mt-6"
              >
                <div className="chapter relative overflow-hidden rounded-xs p-6 shadow-paper">
                  <p className="text-sm text-ink/65">Sealed · {PAGE.weekday}, Oct 25</p>
                  <p className="mt-1 font-display text-[1.7rem] leading-tight">{PASS_TITLE}</p>
                  {note.trim() ? <p className="mt-2 text-ink/75">“{note.trim()}”</p> : null}
                  <div className="mt-6 flex items-center gap-2">
                    <motion.span
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -26 }}
                      animate={{ opacity: 1, scale: 1, rotate: -6 }}
                      transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
                      className="inline-block"
                    >
                      <PersonSeal initial={me.initial} size={44} title="Your side, written" />
                    </motion.span>
                    {people.map((id) => (
                      <PersonSeal key={id} initial={person(id).initial} size={44} state="blank" title={`${person(id).first}, not written yet`} />
                    ))}
                  </div>
                  <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink/80">
                    {listNames(names)} will each write {people.length > 1 ? "their" : "a"} side without seeing yours. It
                    unfolds when {people.length > 1 ? "everyone has" : "they have"}, or on Sunday at 9pm.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => goToScreen("people")}>
                    See it on your People page
                  </Button>
                  <Button variant="quiet" onClick={() => setState((s) => ({ ...s, passed: false }))}>
                    Withdraw it
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="choose" initial={false} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                <figure className="rule mt-5 border-l-2 pl-4">
                  {chosen.length ? (
                    <blockquote className="line-clamp-4 text-[1.0625rem] leading-relaxed text-ink/85">
                      {chosen.map((p) => p.text).join(" … ")}
                    </blockquote>
                  ) : (
                    <p className="text-[1.0625rem] text-ink/65">Choose a line on your page first.</p>
                  )}
                  <figcaption className="mt-2 text-sm text-ink/65">Only these words leave your page.</figcaption>
                </figure>

                <fieldset className="mt-6">
                  <legend className="text-[0.9375rem] font-medium">Who was there?</legend>
                  {named.length ? <p className="mt-1 text-sm text-ink/65">Named in these lines</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {named.map((id) => (
                      <PersonChip key={id} id={id} on={people.includes(id)} onClick={() => togglePerson(id)} />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-ink/65">{named.length ? "Also there?" : "Your people"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {others.map((p) => (
                      <PersonChip key={p.id} id={p.id} on={people.includes(p.id)} onClick={() => togglePerson(p.id)} />
                    ))}
                  </div>
                </fieldset>

                <label htmlFor="pass-note" className="mt-6 block text-[0.9375rem] font-medium">
                  A word on the envelope
                </label>
                <input
                  id="pass-note"
                  value={note}
                  onChange={(e) => setState((s) => ({ ...s, note: e.target.value }))}
                  placeholder="Do you remember the oranges?"
                  className="control mt-2"
                />

                <div className="mt-6 rounded-sm bg-ink/[0.04] p-4">
                  <p className="text-sm text-ink/65">What {names[0] ?? "they"} will see</p>
                  <div className="mt-2 flex items-start gap-3">
                    <PersonSeal initial={me.initial} size={32} />
                    <div className="min-w-0">
                      <p className="font-display text-[1.35rem] leading-tight">{sender} remembers something you were part of.</p>
                      <p className="mt-1 text-ink/70">“{note.trim() || "Do you remember the oranges?"}”</p>
                      <p className="mt-2 text-sm text-ink/65">Your lines stay sealed until they’ve written theirs.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink/65">Unfolds when all have written, or in 72 hours.</p>
                  <Button
                    size="lg"
                    disabled={!chosen.length || !people.length}
                    onClick={() => setState((s) => ({ ...s, passed: true }))}
                    className="w-full sm:w-auto"
                  >
                    {people.length ? `Pass it to ${people.length <= 2 ? listNames(names) : `${people.length} people`}` : "Pass it on"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function PersonChip({ id, on, onClick }: { id: string; on: boolean; onClick: () => void }) {
  const p = person(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-[0.9375rem] transition-colors duration-300 ${ on ? "border-ink bg-ink text-ground" : "border-ink/20 text-ink/80 hover:border-ink/45"
      }`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-full ${on ? "bg-ground" : ""}`}>
        <PersonSeal initial={p.initial} size={22} state={on ? "inked" : "resting"} />
      </span>
      {p.first}
      {on ? <Icon name="check" className="-mr-1 h-4 w-4" strokeWidth={2} /> : null}
    </button>
  );
}
