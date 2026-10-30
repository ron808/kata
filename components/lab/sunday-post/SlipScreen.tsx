"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Fragment, useState } from "react";
import type { Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { ChoiceChips, EASE, ScreenIntro } from "./bits";
import { ALL_SENTENCES, KATA_LETTER, SUNDAY, type Sentence } from "./data";

type Sign = "first" | "initial" | "anon";
type Expiry = "7" | "30" | "never";
const MAX = 3;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Split a sentence into plain text and the phrases Kata hides. */
function pieces(s: Sentence) {
  if (!s.hide?.length) return [{ text: s.text, phrase: false }];
  const re = new RegExp(`(${s.hide.map(escape).join("|")})`, "g");
  return s.text
    .split(re)
    .filter(Boolean)
    .map((t) => ({ text: t, phrase: s.hide!.includes(t) }));
}

function SlipText({ chosen, shown, mode }: { chosen: Sentence[]; shown: string[]; mode: "review" | "public" }) {
  return (
    <>
      {chosen.map((s, i) => {
        const prev = chosen[i - 1];
        const gap = prev && ALL_SENTENCES.indexOf(s) - ALL_SENTENCES.indexOf(prev) > 1;
        return (
          <Fragment key={s.id}>
            {i ? (gap ? " … " : " ") : null}
            {pieces(s).map((p, j) =>
              !p.phrase || shown.includes(p.text) ? (
                <Fragment key={j}>{p.text}</Fragment>
              ) : mode === "review" ? (
                <del key={j} className="text-ink/65 decoration-ink/80 decoration-[1.5px]">
                  <span className="sr-only">hidden: </span>
                  {p.text}
                </del>
              ) : (
                <span
                  key={j}
                  role="img"
                  aria-label="hidden"
                  className="mx-[0.1em] inline-block h-[0.9em] translate-y-[0.12em] rounded-[2px] bg-ink/80"
                  style={{ width: `${Math.max(2.5, p.text.length * 0.42)}em` }}
                />
              ),
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export function SlipScreen({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<string[]>(["a2"]);
  const [shown, setShown] = useState<string[]>([]);
  const [sign, setSign] = useState<Sign>("first");
  const [expiry, setExpiry] = useState<Expiry>("30");
  const [cut, setCut] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const chosen = ALL_SENTENCES.filter((s) => picked.includes(s.id));
  const phrases = [...new Set(chosen.flatMap((s) => s.hide ?? []))];
  const display = sign === "first" ? me.first : sign === "initial" ? `${me.initial}.` : "a Kata writer";
  const ends = expiry === "never" ? "when you revoke it" : expiry === "7" ? "on 8 November" : "on 1 December";

  function toggle(id: string) {
    if (cut) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));
  }

  return (
    <div>
      <ScreenIntro
        title="Cut a slip"
        lede="Share a few lines of Kata’s letter as a small paper card. Kata strikes names and anything medical before you see it, and you check every word before it leaves."
      />

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        {/* Choose the lines */}
        <section aria-labelledby="slip-source" className="lg:col-span-6">
          <div className="sheet px-[clamp(1.25rem,4.5vw,2.5rem)] py-[clamp(1.5rem,4.5vw,2.25rem)]">
            <div className="rule flex items-baseline justify-between gap-4 border-b pb-4">
              <h3 id="slip-source" className="font-display text-[1.9rem] leading-none">
                Kata’s letter
              </h3>
              <p className="text-sm text-ink/65">{SUNDAY}</p>
            </div>
            <p className="mt-4 text-sm text-ink/65">
              Choose up to {MAX} lines. {picked.length} chosen.
            </p>
            <div className="mt-3 space-y-5">
              {KATA_LETTER.map((para, i) => (
                <div key={i} className="space-y-0.5">
                  {para.map((s) => {
                    const on = picked.includes(s.id);
                    const full = !on && picked.length >= MAX;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        disabled={cut || full}
                        onClick={() => toggle(s.id)}
                        className={`-mx-2.5 block min-h-11 w-[calc(100%+1.25rem)] rounded-sm px-2.5 py-1.5 text-left text-[1.0625rem] leading-[1.6] transition-colors duration-300 disabled:cursor-default ${ on ? "bg-accent/15 text-ink" : "text-ink/80 hover:bg-ink/[0.04] disabled:hover:bg-transparent"
                        }`}
                      >
                        {s.text}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Review the slip */}
        <section aria-labelledby="slip-review" className="space-y-8 lg:col-span-6">
          <h3 id="slip-review" className="sr-only">
            Review the slip
          </h3>
          <div className="relative px-2 pt-2">
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-sm border-[1.5px] border-dashed border-ink/35"
              animate={{ opacity: cut ? 0 : 1 }}
              transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
            />
            <motion.svg
              aria-hidden
              viewBox="0 0 24 24"
              className="absolute -top-2.5 left-6 h-5 w-5 bg-ground text-ink/65"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              animate={{ opacity: cut ? 0 : 1, x: cut ? 40 : 0 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
            >
              <path d="M6 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 8l12 10M8 16 20 6" />
            </motion.svg>
            <motion.figure
              className="sheet relative m-2 p-[clamp(1.25rem,4.5vw,2.25rem)]"
              animate={cut ? { rotate: -1.5, y: -8 } : { rotate: 0, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
            >
              <blockquote className="text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.65] text-ink/90">
                {chosen.length ? <SlipText chosen={chosen} shown={shown} mode="review" /> : <span className="text-ink/55">Choose a line from the letter.</span>}
              </blockquote>
              <figcaption className="rule mt-6 flex items-center justify-between gap-4 border-t pt-4">
                <span className="text-sm text-ink/65">From a Sunday letter Kata wrote to {display}</span>
                <PersonSeal initial={sign === "anon" ? "" : me.initial} size={34} state={sign === "anon" ? "blank" : "inked"} className="-rotate-6" />
              </figcaption>
            </motion.figure>
          </div>

          {phrases.length ? (
            <fieldset disabled={cut} className="min-w-0">
              <legend className="font-medium">Kata struck {phrases.length === 1 ? "one detail" : `${phrases.length} details`}</legend>
              <p className="mt-1 text-sm text-ink/65">Struck words become a black bar for whoever opens the link.</p>
              <ul className="mt-2">
                {phrases.map((ph) => (
                  <li key={ph}>
                    <label className="relative flex min-h-11 cursor-pointer items-center gap-3 text-[0.9375rem]">
                      <input
                        type="checkbox"
                        checked={!shown.includes(ph)}
                        onChange={(e) => setShown((s) => (e.target.checked ? s.filter((x) => x !== ph) : [...s, ph]))}
                        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
                      />
                      <span
                        aria-hidden
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink/45 text-ground transition-colors duration-300 peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
                      >
                        <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </span>
                      Hide “{ph}”
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}

          <ChoiceChips
            name="slip-sign"
            legend="Sign it as"
            disabled={cut}
            options={[
              { value: "first", label: me.first },
              { value: "initial", label: `${me.initial}.` },
              { value: "anon", label: "A Kata writer" },
            ]}
            value={sign}
            onChange={setSign}
          />
          <ChoiceChips
            name="slip-expiry"
            legend="The link ends"
            disabled={cut}
            options={[
              { value: "7", label: "In 7 days" },
              { value: "30", label: "In 30 days" },
              { value: "never", label: "When I revoke it" },
            ]}
            value={expiry}
            onChange={setExpiry}
          />

          <div className="rule border-t pt-7">
            {!cut ? (
              <>
                <Button size="lg" disabled={!chosen.length} onClick={() => setCut(true)}>
                  Cut the slip
                </Button>
                <p className="mt-3 text-sm text-ink/65">It gets its own link. It’s hidden from search and ends {ends}.</p>
              </>
            ) : (
              <p role="status" className="text-ink/70">
                Cut. The page below is exactly what the link opens.
              </p>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {cut ? (
          <motion.section
            key="public"
            aria-labelledby="public-title"
            className="rule mt-14 border-t pt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
          >
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div>
                <h3 id="public-title" className="font-display text-[clamp(1.75rem,1.5rem+1vw,2.25rem)] leading-none">
                  What they see
                </h3>
                <p className="mt-2 text-ink/70">The only thing to do on it is write back, or begin a book of their own.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={revoked} onClick={() => setCopied(true)}>
                  <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
                  {copied ? "Link copied" : "Copy link"}
                </Button>
                {revoked ? (
                  <Button
                    variant="quiet"
                    onClick={() => {
                      setRevoked(false);
                      setCut(false);
                      setCopied(false);
                    }}
                  >
                    Cut a new one
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => setRevoked(true)}>
                    Revoke
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-4">
                <h4 className="font-medium">Pasted into a chat</h4>
                <p className="mt-1 text-sm text-ink/65">The preview shows the slip itself, already redacted.</p>
                <LinkPreview chosen={chosen} shown={shown} display={display} revoked={revoked} me={me} sign={sign} />
              </div>
              <div className="min-w-0 lg:col-span-8">
                <div className="rule overflow-hidden rounded-md border bg-raised">
                  <div className="rule flex items-center gap-3 border-b px-4 py-3">
                    <span aria-hidden className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
                      <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
                      <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
                    </span>
                    <span className="min-w-0 flex-1 truncate rounded-sm bg-ground px-3 py-1.5 text-sm text-ink/65">kata.app/slip/m7q2x</span>
                    <span className="hidden shrink-0 text-sm text-ink/65 sm:inline">Not in search</span>
                  </div>
                  <div className="bg-ground px-margin py-[clamp(2.5rem,6vw,4.5rem)]">
                    {revoked ? (
                      <div className="mx-auto max-w-[28rem] text-center">
                        <PersonSeal initial="" size={40} state="resting" className="mx-auto" />
                        <p className="mt-4 font-display text-prompt">This slip was taken back by its writer.</p>
                        <p className="mt-2 text-ink/65">Anyone who opens the link now sees only this.</p>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-[32rem]">
                        <figure className="sheet -rotate-1 p-[clamp(1.25rem,4.5vw,2.25rem)]">
                          <blockquote className="text-[clamp(1.125rem,1.05rem+0.4vw,1.3125rem)] leading-[1.65] text-ink/90">
                            <SlipText chosen={chosen} shown={shown} mode="public" />
                          </blockquote>
                          <figcaption className="rule mt-6 flex items-center justify-between gap-4 border-t pt-4">
                            <span className="text-sm text-ink/65">From a Sunday letter Kata wrote to {display}</span>
                            <PersonSeal initial={sign === "anon" ? "" : me.initial} size={34} state={sign === "anon" ? "blank" : "inked"} className="-rotate-6" />
                          </figcaption>
                        </figure>
                        <p className="mt-10 text-center font-display text-prompt ">
                          {sign === "anon" ? "Someone" : display} keeps a small notebook on Kata.
                        </p>
                        <div className="mt-5 flex flex-col items-stretch justify-center gap-3 xs:flex-row xs:items-center">
                          <Button size="lg" onClick={() => setPreview("write")}>
                            Write back to them
                          </Button>
                          <Button variant="secondary" size="lg" onClick={() => setPreview("begin")}>
                            Begin your own book
                          </Button>
                        </div>
                        <p aria-live="polite" className="mx-auto mt-4 min-h-6 max-w-[26rem] text-center text-sm text-ink/65">
                          {preview === "write"
                            ? `Opens a letter sheet addressed to ${display}. It arrives on Sunday morning.`
                            : preview === "begin"
                              ? "Opens sign-up with a first page ready to write."
                              : `This link ends ${ends}.`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** How the link unfurls where it's shared: the Open Graph card, drawn from the slip itself. */
function LinkPreview({
  chosen,
  shown,
  display,
  revoked,
  me,
  sign,
}: {
  chosen: Sentence[];
  shown: string[];
  display: string;
  revoked: boolean;
  me: Me;
  sign: Sign;
}) {
  return (
    <figure className="mt-4">
      <div className="ml-auto max-w-[22rem] rounded-md rounded-br-xs bg-ink/[0.06] p-2.5">
        <p className="px-1.5 pb-2 pt-0.5 text-[0.9375rem] text-ink/80">
          this made me think of all of you <span className="text-ink/65 underline decoration-ink/30 underline-offset-2">kata.app/slip/m7q2x</span>
        </p>
        <div className="overflow-hidden rounded-sm bg-surface">
          <div aria-hidden className="relative aspect-[1.91/1] overflow-hidden bg-ground p-[6%]">
            {revoked ? (
              <div className="grid h-full place-items-center text-center">
                <p className="font-display text-[1.25rem] text-ink/65">Taken back by its writer</p>
              </div>
            ) : (
              <div className="sheet relative h-full -rotate-1 p-[6%]">
                <p className="line-clamp-3 text-[0.875rem] leading-[1.5] text-ink/85">
                  <SlipText chosen={chosen} shown={shown} mode="public" />
                </p>
                <PersonSeal
                  initial={sign === "anon" ? "" : me.initial}
                  size={22}
                  state={sign === "anon" ? "blank" : "inked"}
                  className="absolute bottom-[9%] right-[7%] -rotate-6"
                />
              </div>
            )}
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[0.8125rem] text-ink/65">kata.app</p>
            <p className="mt-0.5 font-medium leading-snug">
              {revoked ? "This slip is no longer here" : `A slip from ${sign === "anon" ? "someone’s" : `${display}’s`} Sunday letter`}
            </p>
            <p className="mt-0.5 text-sm text-ink/65">{revoked ? "Kata · a small notebook" : "Write back, or begin your own book."}</p>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-right text-[0.8125rem] text-ink/65">An example chat</figcaption>
    </figure>
  );
}
