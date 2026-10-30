"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { person, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button, buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { ChoiceChips, EASE, MoodStrip, Postmark, ScreenIntro, Stamp, useHold } from "./bits";
import { FOLLOWERS, FOLLOW_REQUEST, ME_CITY, MY_LINES, MY_MOOD, SUNDAY_SHORT, WEEK_RANGE, WORD_CHOICES } from "./data";

type Status = "draft" | "sealed" | "skipped";
const OWN = "__own";

function listNames(ids: string[]) {
  const names = ids.map((id) => person(id).first);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "";
}

export function PostcardScreen({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [struck, setStruck] = useState<string[]>(MY_LINES.filter((l) => l.sensitive).map((l) => l.id));
  const [choice, setChoice] = useState<string>(WORD_CHOICES[0]);
  const [ownWord, setOwnWord] = useState("");
  const [lineDraft, setLineDraft] = useState("");
  const [ownLine, setOwnLine] = useState<string | null>(null);
  const [followers, setFollowers] = useState(FOLLOWERS);
  const [request, setRequest] = useState<"waiting" | "approved" | "declined">("waiting");
  const [status, setStatus] = useState<Status>("draft");

  const word = choice === OWN ? ownWord.trim() || "…" : choice;
  const kept = MY_LINES.filter((l) => !struck.includes(l.id));
  const keptCount = kept.length + (ownLine ? 1 : 0);
  const draft = status === "draft";

  const { holding, bind } = useHold(900, () => {
    if (keptCount > 0) setStatus("sealed");
  });

  function toggle(id: string) {
    setStruck((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const lines = draft ? MY_LINES : kept;

  return (
    <div>
      <ScreenIntro
        title="Your postcard"
        lede={`Kata drafted it at 7:00 this morning from your six pages. Strike any line, add one of your own, then press your seal. Nothing leaves until you do.`}
      />

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        {/* The card itself */}
        <div className="lg:col-span-7">
          <motion.article
            aria-label="Your postcard, as it will arrive"
            className="sheet relative grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_12.5rem]"
            animate={{ opacity: status === "skipped" ? 0.55 : 1 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          >
            <div className="p-[clamp(1.4rem,4.5vw,2.5rem)]">
              <p className="text-sm text-ink/65">
                {me.first}’s week · {WEEK_RANGE}
              </p>
              <p className="mt-3 break-words font-display text-[clamp(2.5rem,2rem+2.2vw,3.6rem)] leading-none">{word}</p>
              <p className="sr-only">is the word of the week.</p>

              {draft ? (
                <p className="mt-6 flex items-center gap-2 text-sm text-ink/65">
                  <Icon name="pen" className="h-4 w-4" />
                  Tap a line to strike it out.
                </p>
              ) : null}

              <ul className="mt-3 space-y-1">
                <AnimatePresence initial={false}>
                  {lines.map((l) => {
                    const off = struck.includes(l.id);
                    return (
                      <motion.li
                        key={l.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                      >
                        {draft ? (
                          <button
                            type="button"
                            aria-pressed={off}
                            onClick={() => toggle(l.id)}
                            className="-mx-2.5 block min-h-11 w-[calc(100%+1.25rem)] rounded-sm px-2.5 py-2 text-left transition-colors duration-300 hover:bg-ink/[0.04]"
                          >
                            <span className="sr-only">{off ? "Struck out: " : ""}</span>
                            <span
                              className={`text-[1.125rem] leading-[1.6] ${ off ? "text-ink/65 line-through decoration-ink/70 decoration-[1.5px]" : "text-ink/90"
                              }`}
                            >
                              {l.text}
                            </span>
                            {l.sensitive && off ? <span className="mt-1 block text-sm text-ink/65">{l.sensitive}</span> : null}
                          </button>
                        ) : (
                          <p className="py-2 text-[1.125rem] leading-[1.6] text-ink/90">{l.text}</p>
                        )}
                      </motion.li>
                    );
                  })}
                  {ownLine ? (
                    <motion.li
                      key="own"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                      className="flex items-start gap-2"
                    >
                      <p className="flex-1 py-2 text-[1.125rem] leading-[1.6] text-ink">{ownLine}</p>
                      {draft ? (
                        <button
                          type="button"
                          onClick={() => setOwnLine(null)}
                          aria-label="Take your line off the card"
                          className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink/65 hover:bg-ink/[0.05] hover:text-ink"
                        >
                          <Icon name="close" className="h-4 w-4" />
                        </button>
                      ) : null}
                    </motion.li>
                  ) : null}
                </AnimatePresence>
              </ul>
            </div>

            <div className="rule flex flex-col gap-6 border-t p-[clamp(1.4rem,4.5vw,2rem)] sm:border-l sm:border-t-0">
              <div className="relative self-end">
                <Stamp motif="pot" />
                <Postmark city={ME_CITY} date={SUNDAY_SHORT} size={44} className="absolute bottom-[38%] right-0" />
              </div>
              <MoodStrip mood={MY_MOOD} />
              <div>
                <p className="text-sm text-ink/65">For</p>
                <p className="ruled mt-1 text-[1.0625rem] text-ink/90" style={{ ["--rule" as string]: "1.9rem" }}>
                  {listNames(followers)}
                </p>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                <p className="font-display text-[1.6rem] leading-none">— {me.first}</p>
                <span className="relative grid h-14 w-14 place-items-center">
                  <PersonSeal initial={me.initial} size={52} state="blank" className={status === "sealed" ? "opacity-0" : ""} />
                  <AnimatePresence>
                    {status === "sealed" ? (
                      <motion.span
                        key="stamped"
                        className="absolute inset-0 grid place-items-center"
                        initial={{ opacity: 0, scale: reduce ? 1 : 1.9, rotate: reduce ? -8 : -32 }}
                        animate={{ opacity: 1, scale: 1, rotate: -8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
                      >
                        <PersonSeal initial={me.initial} size={52} title={`Sealed by ${me.first}`} />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              </div>
            </div>
          </motion.article>
          <p aria-live="polite" className="mt-4 text-sm text-ink/65">
            {keptCount} of {MY_LINES.length + (ownLine ? 1 : 0)} lines {status === "sealed" ? "went out" : "will go out"}. Only the lines you leave in ever leave.
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-9 lg:col-span-5">
          <div>
            <ChoiceChips
              name="word"
              legend="Word of the week"
              hint="Kata’s pick first. Or choose your own."
              disabled={!draft}
              options={[...WORD_CHOICES.map((w) => ({ value: w, label: w })), { value: OWN, label: "My own" }]}
              value={choice}
              onChange={setChoice}
            />
            {choice === OWN ? (
              <div className="mt-3">
                <label htmlFor="own-word" className="sr-only">
                  Your word of the week
                </label>
                <input
                  id="own-word"
                  autoFocus
                  maxLength={24}
                  disabled={!draft}
                  value={ownWord}
                  onChange={(e) => setOwnWord(e.target.value)}
                  placeholder="One word, or two"
                  className="control"
                />
              </div>
            ) : null}
          </div>

          {!ownLine && draft ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (lineDraft.trim()) {
                  setOwnLine(lineDraft.trim());
                  setLineDraft("");
                }
              }}
            >
              <label htmlFor="own-line" className="font-medium">
                Add a line of your own
              </label>
              <p className="mt-1 text-sm text-ink/65">Something Kata couldn’t know.</p>
              <div className="mt-3 flex gap-2">
                <input
                  id="own-line"
                  maxLength={140}
                  value={lineDraft}
                  onChange={(e) => setLineDraft(e.target.value)}
                  placeholder="Called Nani. She was right about the pan."
                  className="control min-w-0 flex-1"
                />
                <Button type="submit" variant="secondary" className="h-[3.25rem] shrink-0" disabled={!lineDraft.trim()}>
                  Add
                </Button>
              </div>
            </form>
          ) : null}

          <section aria-labelledby="who-gets-it">
            <h3 id="who-gets-it" className="font-medium">
              Who gets it
            </h3>
            <p className="mt-1 text-sm text-ink/65">Only people you let in. They can’t see each other, or any count.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {followers.map((id) => (
                <li key={id} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 py-1 pl-1.5 pr-4 text-[0.9375rem]">
                  <PersonSeal initial={person(id).initial} size={30} />
                  {person(id).first}
                </li>
              ))}
            </ul>
            {request === "waiting" ? (
              <div className="mt-4 rounded-md bg-ink/[0.04] p-4">
                <p className="flex items-center gap-3 text-[0.9375rem] text-ink/80">
                  <PersonSeal initial={person(FOLLOW_REQUEST).initial} size={30} state="blank" />
                  <span>
                    <span className="font-medium text-ink">{person(FOLLOW_REQUEST).name}</span> asked to receive your Sunday postcard.
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFollowers((f) => [...f, FOLLOW_REQUEST]);
                      setRequest("approved");
                    }}
                  >
                    Let {person(FOLLOW_REQUEST).first} in
                  </Button>
                  <Button variant="quiet" onClick={() => setRequest("declined")}>
                    Not now
                  </Button>
                </div>
              </div>
            ) : (
              <p role="status" className="mt-3 text-sm text-ink/65">
                {request === "approved"
                  ? `${person(FOLLOW_REQUEST).first} gets postcards from this Sunday on.`
                  : `${person(FOLLOW_REQUEST).first} isn’t told. The request waits until you decide.`}
              </p>
            )}
          </section>

          <div className="rule border-t pt-7" aria-live="polite">
            {status === "draft" ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    {...bind}
                    disabled={keptCount === 0}
                    className={buttonClass({
                      size: "lg",
                      className: "relative touch-none overflow-hidden [-webkit-touch-callout:none]",
                    })}
                  >
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 origin-left bg-on-accent/20"
                      initial={false}
                      animate={{ scaleX: holding ? 1 : 0 }}
                      transition={{ duration: reduce ? 0 : holding ? 0.9 : 0.25, ease: EASE }}
                    />
                    <span className="relative">{holding ? "Keep holding…" : "Hold to seal & send"}</span>
                  </button>
                  <Button variant="quiet" size="lg" onClick={() => setStatus("skipped")}>
                    Skip this week
                  </Button>
                </div>
                <p className="mt-3 text-sm text-ink/65">
                  {keptCount === 0
                    ? "Leave at least one line in, or skip the week."
                    : "Press and hold, like a hanko. It goes out Sunday at 8:00, and you can unsend it for 24 hours."}
                </p>
              </>
            ) : status === "sealed" ? (
              <>
                <p className="font-display text-prompt">Sealed.</p>
                <p className="mt-1 text-ink/70">It reaches {listNames(followers)} on Sunday morning.</p>
                <Button variant="secondary" size="lg" className="mt-4" onClick={() => setStatus("draft")}>
                  Unsend
                </Button>
              </>
            ) : (
              <>
                <p className="font-display text-prompt">Skipped this week.</p>
                <p className="mt-1 text-ink/70">No postcard goes out, and nobody is told.</p>
                <Button variant="secondary" size="lg" className="mt-4" onClick={() => setStatus("draft")}>
                  Write one after all
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
