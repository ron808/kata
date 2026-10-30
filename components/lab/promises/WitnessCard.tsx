"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type FormEvent, type ReactNode } from "react";
import type { Me } from "@/components/lab/cast";
import { person } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import { WITNESS } from "./data";
import { EASE, HoldSeal } from "./HoldSeal";

type View = "app" | "email";
type Moment = "made" | "kept";

export function WitnessCard({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const lena = person(WITNESS.from);
  const ana = person(WITNESS.otherWitness);
  const [view, setView] = useState<View>("app");
  const [moment, setMoment] = useState<Moment>("made");
  const [withYou, setWithYou] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [mine, setMine] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  function send(e: FormEvent) {
    e.preventDefault();
    if (mine.trim()) setSent(mine.trim());
  }

  const fade = reduce ? { opacity: 0 } : { opacity: 0, y: 10 };

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Where it arrives"
            value={view}
            onChange={setView}
            options={[
              { value: "app", label: "In Kata" },
              { value: "email", label: "By email" },
            ]}
          />
          <Segmented
            label="Which card"
            value={moment}
            onChange={setMoment}
            options={[
              { value: "made", label: "When made" },
              { value: "kept", label: "When kept" },
            ]}
          />
        </div>

        <div className={`mt-6 ${view === "email" ? "rounded-md bg-raised p-[clamp(0.75rem,3vw,1.5rem)]" : ""}`}>
          {view === "email" ? (
            <dl className="mb-4 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-1 text-sm">
              <dt className="text-ink/65">From</dt>
              <dd className="truncate text-ink/85">Kata, for {lena.name}</dd>
              <dt className="text-ink/65">To</dt>
              <dd className="truncate text-ink/85">{me.name}</dd>
              <dt className="text-ink/65">Subject</dt>
              <dd className="text-ink/85">
                {moment === "made" ? `${lena.first} made a promise and named you` : `${lena.first} kept it`}
              </dd>
            </dl>
          ) : null}

          <article aria-labelledby="witness-promise" className="sheet relative overflow-clip px-[clamp(1.25rem,5vw,3rem)] pb-8 pt-7">
            <p className="text-sm text-ink/65">
              {moment === "made"
                ? `${lena.first} asked you to witness one promise · ${WITNESS.made}`
                : `${lena.first} kept a promise you witnessed · ${WITNESS.kept}`}
            </p>
            <h2
              id="witness-promise"
              className="mt-4 font-display text-[clamp(2rem,1.4rem+2.6vw,3.25rem)] leading-[1.02]"
            >
              {WITNESS.text}
            </h2>
            <p className="mt-3 font-display text-prompt text-ink/70">by {WITNESS.by}</p>

            <AnimatePresence mode="wait" initial={false}>
              {moment === "made" ? (
                <motion.div key="made" initial={fade} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                  <p className="mt-6 max-w-[32rem] text-lg leading-relaxed text-ink/85">
                    You won’t hear about it again until it ends. If you want to, you can say you’re with her, once a week.
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4">
                    <Button size="lg" variant={withYou ? "secondary" : "primary"} disabled={withYou} onClick={() => setWithYou(true)}>
                      {withYou ? "Sent this week" : "I’m with you"}
                    </Button>
                    <AnimatePresence>
                      {withYou ? (
                        <motion.span
                          key="stamp"
                          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.5, rotate: -18 }}
                          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -5 }}
                          transition={{ duration: 0.5, ease: EASE }}
                          className="inline-flex items-center gap-2 rounded-sm border-2 border-ink/50 px-3 py-1.5 font-display text-xl text-ink/80"
                        >
                          with you · {me.first}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <p className="mt-3 text-sm text-ink/65" aria-live="polite">
                    {withYou ? `${lena.first} sees one small stamp on her page. You can send another next Monday.` : "One stamp a week. It doesn’t ask her how it’s going."}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="kept" initial={fade} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                  <p className="mt-6 max-w-[32rem] text-lg leading-relaxed text-ink/85">“{WITNESS.line}”</p>
                  <ul aria-label="Seals" className="mt-8 grid grid-cols-3 gap-[clamp(0.75rem,3vw,2rem)]">
                    <SealSlot name={lena.first} note="her seal">
                      <span className="absolute bottom-0 left-1 -rotate-[7deg]">
                        <PersonSeal initial={lena.initial} size={52} className="bg-surface" />
                      </span>
                    </SealSlot>
                    <SealSlot name={ana.first} note={`from ${ana.city}`}>
                      <span className="absolute bottom-0 left-1 rotate-[5deg]">
                        <PersonSeal initial={ana.initial} size={52} className="bg-surface" />
                      </span>
                    </SealSlot>
                    <SealSlot name={`${me.first} (you)`} note={sealed ? "sealed just now" : "hold to press"}>
                      {/* HoldSeal pads its 52px seal to a 60px target (4px a side); offset so the seal lines up. */}
                      <span className="absolute -bottom-1 left-0 flex">
                        <HoldSeal initial={me.initial} size={52} sealed={sealed} onSeal={() => setSealed(true)} label="Press and hold your seal" />
                      </span>
                    </SealSlot>
                  </ul>
                  <p className="mt-5 text-[0.9375rem] text-ink/75" aria-live="polite">
                    {sealed ? `Sealed. Your seal sits beside hers now, on her page and in your history.` : "Hold your seal to co-sign. It’s the only reaction there is: no likes, no comments."}
                  </p>

                  <AnimatePresence>
                    {sealed ? (
                      <motion.form
                        key="loop"
                        onSubmit={send}
                        initial={fade}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
                        className="rule mt-8 border-t pt-6"
                      >
                        {sent ? (
                          <div className="flex items-start gap-3">
                            <Seal size={32} cut="surface" className="-rotate-6" />
                            <p className="text-[0.9375rem] text-ink/80">
                              Lena has a card asking her to witness <span className="">“{sent}”</span>. She’ll hear once now and once when it ends.
                            </p>
                          </div>
                        ) : (
                          <>
                            <label htmlFor="own-promise" className="block font-display text-prompt ">
                              Is there something you’d like {lena.first} to witness?
                            </label>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                              <input
                                id="own-promise"
                                value={mine}
                                onChange={(e) => setMine(e.target.value)}
                                placeholder="Run the 10k, by December"
                                className="control sm:flex-1"
                                autoComplete="off"
                              />
                              <Button type="submit" size="lg" variant="secondary" disabled={!mine.trim()}>
                                Name {lena.first}
                              </Button>
                            </div>
                          </>
                        )}
                      </motion.form>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </article>
          {view === "email" ? (
            <div className="mt-4 space-y-1 px-1 text-sm text-ink/70">
              <p>No account needed: your seal works from this email. One email now, one when it ends, nothing in between.</p>
              <p>{lena.first} chose you as a witness. If it doesn’t feel right, you can step aside and she won’t be told why.</p>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="space-y-8 lg:pt-16">
        <section>
          <h3 className="font-medium">What you can see</h3>
          <ul className="mt-2 space-y-1.5 text-[0.9375rem] text-ink/75">
            <li>The promise, in her words</li>
            <li>The day she set</li>
            <li>How it ended</li>
          </ul>
        </section>
        <section>
          <h3 className="font-medium">What you never see</h3>
          <ul className="mt-2 space-y-1.5 text-[0.9375rem] text-ink/75">
            <li>Her pages, mood or energy</li>
            <li>How many days she carried it</li>
            <li>Promises she let go</li>
          </ul>
        </section>
        <p className="text-[0.9375rem] leading-relaxed text-ink/75">
          If {lena.first} removes you as a witness, you aren’t told. There are no reminders to send and nothing to nag with.
        </p>
      </aside>
    </div>
  );
}

function SealSlot({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <li className="min-w-0">
      {/* Seals are pressed onto the signature line, as on the kept card in your history. */}
      <div className="relative h-[3.75rem]">
        <span aria-hidden className="rule absolute inset-x-0 bottom-3 border-t" />
        {children}
      </div>
      <p className="mt-1.5 truncate text-sm text-ink/80">{name}</p>
      <p className="truncate text-sm text-ink/65">{note}</p>
    </li>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-ink/15 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`h-11 rounded-sm px-3.5 text-[0.9375rem] transition-colors duration-300 sm:px-4 ${on ? "bg-ink text-ground" : "text-ink/70 hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
