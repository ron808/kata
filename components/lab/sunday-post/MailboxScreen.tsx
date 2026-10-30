"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";
import { person, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { BreakingSeal, BrokenSeal, EASE, MoodStrip, Postmark, ScreenIntro, Stamp, useHold } from "./bits";
import { Envelope, OPENING } from "./Envelope";
import { KATA_LETTER, NEW_SENDER, NEXT_SUNDAY, POST, SUNDAY_AFTER, SUNDAY, WEEK_RANGE, type Post } from "./data";

type Phase = "sealed" | "breaking" | "read";

export function MailboxScreen({ me, onWriteBack }: { me: Me; onWriteBack: (id: string) => void }) {
  const reduce = useReducedMotion();
  const [opened, setOpened] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("sealed");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fanHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const post = POST.find((p) => p.id === openId) ?? null;

  function choose(p: Post) {
    setOpenId(p.id);
    setPhase(opened.includes(p.id) ? "read" : "sealed");
  }

  function breakSeal() {
    if (!post) return;
    setPhase("breaking");
    const id = post.id;
    timer.current = setTimeout(() => {
      setPhase("read");
      setOpened((o) => (o.includes(id) ? o : [...o, id]));
    }, reduce ? 0 : OPENING.done * 1000);
  }

  function back() {
    setOpenId(null);
    requestAnimationFrame(() => fanHeading.current?.focus());
  }

  return (
    <div>
      <ScreenIntro
        title={`Sunday morning, ${SUNDAY.replace("Sunday ", "")}`}
        lede="Kata’s letter on top. Under it, three postcards from people you follow, and one letter with a Lisbon postmark."
      />

      <div className="mt-8">
        <KataLetter me={me} />

        <AnimatePresence mode="wait" initial={false}>
          {post ? (
            <motion.div
              key={`stage-${post.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
            >
              <Stage post={post} phase={phase} me={me} onBreak={breakSeal} onBack={back} onWriteBack={onWriteBack} />
            </motion.div>
          ) : (
            <motion.section
              key="fan"
              aria-labelledby="post-heading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
            >
              <h3 id="post-heading" ref={fanHeading} tabIndex={-1} className="sr-only">
                This Sunday’s post, {POST.length} envelopes
              </h3>
              <Fan opened={opened} onChoose={choose} />
              <p className="mt-8 text-center text-sm text-ink/65 lg:mt-4">
                No counts and no read receipts. Nobody is told when you open their post.
              </p>
              <NewSenderTray />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Kata's letter, on top of the pile ────────────────────────────────────────

function KataLetter({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const paras = KATA_LETTER.map((p) => p.map((s) => s.text).join(" "));
  return (
    <article aria-labelledby="kata-letter-title" className="chapter relative z-10 mx-auto max-w-[52rem] rounded-xs p-[clamp(1.4rem,4vw,2.5rem)] shadow-paper">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink/65">Weekly letter · {WEEK_RANGE}</p>
          <h3 id="kata-letter-title" className="mt-1 font-display text-[clamp(1.9rem,1.6rem+1.2vw,2.5rem)] leading-none">
            A letter for you
          </h3>
        </div>
        <Seal size={48} cut="ground" className="-rotate-6" />
      </div>
      <div id="kata-letter-body" className="mt-6 max-w-[40rem] space-y-4 text-[1.125rem] leading-[1.7] text-ink/85">
        <p>Dear {me.first},</p>
        <p>{paras[0]}</p>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="rest"
              className="space-y-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
            >
              {paras.slice(1).map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className="pt-2 font-display text-[1.75rem] leading-none text-ink">— Kata</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="kata-letter-body"
        onClick={() => setOpen((o) => !o)}
        className="link mt-4 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-ink"
      >
        {open ? "Fold it away" : "Read the whole letter"}
        <Icon name="arrow-down" className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
    </article>
  );
}

// ── The fanned stack (desktop) and the pile (phones) ─────────────────────────

function postLabel(p: Post) {
  const who = person(p.from);
  return p.kind === "letter" ? `Letter · ${who.city}${p.since ? ` · ${p.since}` : ""}` : `Postcard · ${who.city}`;
}

function sealFor(p: Post, opened: boolean, size: number) {
  const who = person(p.from);
  return opened ? <BrokenSeal initial={who.initial} size={size} /> : <PersonSeal initial={who.initial} size={size} />;
}

function ariaFor(p: Post, opened: boolean) {
  const who = person(p.from);
  return `${p.kind === "letter" ? "Letter" : "Postcard"} from ${who.name}, postmarked ${who.city} ${p.postmarked}. ${opened ? "Opened" : "Sealed"}.`;
}

function Fan({ opened, onChoose }: { opened: string[]; onChoose: (p: Post) => void }) {
  const tops = ["2.5rem", "0.75rem", "0.75rem", "2.25rem"];
  const pile = [...POST].reverse();
  return (
    <>
      <div className="relative mx-auto -mt-10 hidden h-[17.5rem] max-w-[60rem] lg:block">
        {POST.map((p, i) => {
          const isOpen = opened.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChoose(p)}
              aria-label={ariaFor(p, isOpen)}
              className="absolute w-[21rem] rounded-xs transition-[translate] duration-500 ease-out hover:-translate-y-3 focus-visible:-translate-y-3"
              style={{ left: `calc(${i} * (100% - 21rem) / ${POST.length - 1})`, top: tops[i], rotate: `${p.rotate}deg` }}
            >
              <Envelope
                name={person(p.from).name}
                meta={isOpen ? `${postLabel(p)} · opened` : postLabel(p)}
                motif={p.motif}
                city={person(p.from).city}
                date={p.postmarked}
                seal={sealFor(p, isOpen, 44)}
              />
            </button>
          );
        })}
      </div>

      <ul className="relative -mt-5 mx-auto grid max-w-[30rem] grid-cols-1 px-1 lg:hidden">
        {pile.map((p, i) => {
          const isOpen = opened.includes(p.id);
          return (
            <li key={p.id} className={`relative ${i ? "-mt-12" : ""}`} style={{ zIndex: pile.length - i, rotate: `${p.rotate * 0.35}deg` }}>
              <button type="button" onClick={() => onChoose(p)} aria-label={ariaFor(p, isOpen)} className="block w-full rounded-xs">
                <Envelope
                  name={person(p.from).name}
                  meta={isOpen ? `${postLabel(p)} · opened` : postLabel(p)}
                  motif={p.motif}
                  city={person(p.from).city}
                  date={p.postmarked}
                  seal={sealFor(p, isOpen, 44)}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ── Opening one ──────────────────────────────────────────────────────────────

function HoldSeal({ initial, name, onBreak }: { initial: string; name: string; onBreak: () => void }) {
  const { holding, bind } = useHold(850, onBreak);
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      {...bind}
      aria-label={`Break ${name}’s seal`}
      className="relative grid h-[5.5rem] w-[5.5rem] touch-none sm:h-28 sm:w-28 select-none place-items-center rounded-full [-webkit-touch-callout:none]"
    >
      <span aria-hidden className="absolute inset-2 rounded-full border border-dashed border-accent/45" />
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-accent/15"
        initial={false}
        animate={{ scale: holding ? 1 : 0.5, opacity: holding ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : holding ? 0.85 : 0.3, ease: EASE }}
      />
      <motion.span
        aria-hidden
        className="relative"
        initial={false}
        animate={{ scale: holding ? 0.9 : 1 }}
        transition={{ duration: reduce ? 0 : 0.85, ease: EASE }}
      >
        <PersonSeal initial={initial} size={60} />
      </motion.span>
    </button>
  );
}

function Stage({
  post,
  phase,
  me,
  onBreak,
  onBack,
  onWriteBack,
}: {
  post: Post;
  phase: Phase;
  me: Me;
  onBreak: () => void;
  onBack: () => void;
  onWriteBack: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const who = person(post.from);
  const title = useRef<HTMLHeadingElement>(null);
  const reading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLElement>(null);

  // Bring the envelope into view: on phones Kata's letter sits above it.
  useEffect(() => {
    root.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [reduce]);

  useEffect(() => {
    (phase === "read" ? reading : title).current?.focus({ preventScroll: true });
  }, [phase]);

  return (
    <section ref={root} aria-label={`${post.kind === "letter" ? "Letter" : "Postcard"} from ${who.name}`} className="mx-auto mt-6 max-w-[44rem] scroll-mt-20 lg:scroll-mt-6">
      <button type="button" onClick={onBack} className="-ml-2 inline-flex h-11 items-center gap-2 rounded-md px-2 text-[0.9375rem] text-ink/70 hover:text-ink">
        <Icon name="arrow-left" className="h-4 w-4" />
        All of this Sunday’s post
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {phase !== "read" ? (
          <motion.div
            key="envelope"
            className="mt-2"
            exit={{ opacity: 0, y: 36, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          >
            <div className="mx-auto max-w-[34rem]">
              {/* Room above the envelope for the open flap and the rising letter. */}
              <div className="pointer-events-none relative pt-[36%] sm:-mt-11">
                <motion.h3
                  ref={title}
                  tabIndex={-1}
                  className="absolute inset-x-0 bottom-4 font-display text-prompt text-ink/80 outline-none"
                  initial={false}
                  animate={{ opacity: phase === "sealed" ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                >
                  {post.kind === "letter"
                    ? `A letter from ${who.first}, posted in ${who.city} a week ago`
                    : `${who.first}’s postcard for the week`}
                </motion.h3>
              </div>
              <Envelope
                stage
                name={who.name}
                meta={postLabel(post)}
                motif={post.motif}
                city={who.city}
                date={post.postmarked}
                flapOpen={phase === "breaking"}
                insert={<Insert post={post} me={me} />}
                seal={
                  phase === "sealed" ? (
                    <HoldSeal initial={who.initial} name={who.first} onBreak={onBreak} />
                  ) : (
                    <span className="grid h-[5.5rem] w-[5.5rem] place-items-center sm:h-28 sm:w-28">
                      <BreakingSeal initial={who.initial} size={60} />
                    </span>
                  )
                }
              />
            </div>
            <p aria-live="polite" className="mt-6 text-center text-[0.9375rem] text-ink/70">
              {phase === "sealed"
                ? `Press and hold ${who.first}’s seal to break it.`
                : post.kind === "letter"
                  ? `${who.first}’s seal is broken.`
                  : "Out it comes."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reading"
            className="mt-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
          >
            {post.kind === "letter" ? (
              <LetterRead post={post} me={me} headingRef={reading} onBack={onBack} onWriteBack={onWriteBack} />
            ) : (
              <PostcardRead post={post} me={me} headingRef={reading} onBack={onBack} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** What rises out of the envelope: the first lines of the letter, or the postcard's word. */
function Insert({ post, me }: { post: Post; me: Me }) {
  if (post.kind === "letter") {
    const body = post.body?.(me.first) ?? [];
    return (
      <div className="px-[7cqi] pt-[5cqi] text-[clamp(0.8125rem,3.3cqi,1.0625rem)] leading-[1.6] text-ink/80">
        <p>{body[0]}</p>
        <p className="mt-[2cqi]">{body[1]}</p>
      </div>
    );
  }
  return (
    <div className="px-[7cqi] pt-[5cqi]">
      <p className="font-display text-[clamp(1.75rem,9cqi,2.75rem)] leading-none">{post.word}</p>
      <p className="mt-[3cqi] text-[clamp(0.8125rem,3.3cqi,1.0625rem)] leading-[1.6] text-ink/80">{post.lines?.[0]}</p>
    </div>
  );
}

function LetterRead({
  post,
  me,
  headingRef,
  onBack,
  onWriteBack,
}: {
  post: Post;
  me: Me;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onWriteBack: (id: string) => void;
}) {
  const who = person(post.from);
  const body = post.body?.(me.first) ?? [];
  return (
    <>
      <article className="sheet px-[clamp(1.4rem,5vw,3.25rem)] py-[clamp(1.75rem,5vw,3rem)]">
        <header className="rule flex items-start justify-between gap-4 border-b pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <PersonSeal initial={who.initial} size={40} />
            <div className="min-w-0">
              <h3 ref={headingRef} tabIndex={-1} className="font-display text-[1.9rem] leading-none outline-none">
                {who.name}
              </h3>
              <p className="mt-1 text-sm text-ink/65">
                {who.city} · posted {post.postmarked}
              </p>
            </div>
          </div>
          <div className="relative hidden shrink-0 xs:block">
            <Stamp motif={post.motif} />
            <Postmark city={who.city} date={post.postmarked} size={44} className="absolute bottom-[38%] right-0" />
          </div>
        </header>
        <div className="mt-7 space-y-5 text-prose">
          {body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <footer className="mt-8 flex items-end justify-between gap-4">
          <p className="font-display text-[1.9rem] leading-none">{post.signoff}</p>
          <PersonSeal initial={who.initial} size={44} className="-rotate-6" />
        </footer>
      </article>

      {post.trail ? (
        <ol aria-label="How it travelled" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
          {post.trail.map((step, i) => (
            <li key={step} className="flex items-start gap-3 sm:flex-col sm:gap-2">
              <span aria-hidden className="mt-1.5 flex w-3 items-center sm:mt-0 sm:w-full">
                <span className={`h-3 w-3 shrink-0 rounded-full border-[1.5px] ${i === 1 ? "border-dashed border-ink/45" : "border-ink/70 bg-ink/70"}`} />
                {i < 2 ? <span className="hidden h-px flex-1 border-t border-dashed border-ink/30 sm:block" /> : null}
              </span>
              <span className="text-sm text-ink/70 sm:pr-4">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {post.shoebox ? <p className="mt-5 text-sm text-ink/65">{post.shoebox}</p> : null}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => onWriteBack(post.from)}>
          Write back to {who.first}
        </Button>
        <Button variant="secondary" size="lg" onClick={onBack}>
          Back to the post
        </Button>
      </div>
      <p className="mt-3 text-sm text-ink/65">
        A reply sealed this week is postmarked {NEXT_SUNDAY.replace("Sunday ", "")}, spends a Sunday in transit, and reaches {who.city} on {SUNDAY_AFTER}.
      </p>
    </>
  );
}

function PostcardRead({
  post,
  me,
  headingRef,
  onBack,
}: {
  post: Post;
  me: Me;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
}) {
  const who = person(post.from);
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const fieldId = `margin-${post.id}`;
  return (
    <>
      <article className="sheet relative grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="p-[clamp(1.4rem,4.5vw,2.5rem)]">
          <p className="text-sm text-ink/65">
            {who.first}’s week · {WEEK_RANGE}
          </p>
          <h3 ref={headingRef} tabIndex={-1} className="mt-3 font-display text-[clamp(2.5rem,2rem+2.2vw,3.5rem)] leading-none outline-none">
            {post.word}
          </h3>
          <ul className="mt-6 space-y-3 text-[1.125rem] leading-[1.6] text-ink/90">
            {post.lines?.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <div className="rule flex flex-col gap-6 border-t p-[clamp(1.4rem,4.5vw,2rem)] sm:border-l sm:border-t-0">
          <div className="relative self-end">
            <Stamp motif={post.motif} />
            <Postmark city={who.city} date={post.postmarked} size={44} className="absolute bottom-[38%] right-0" />
          </div>
          {post.mood ? <MoodStrip mood={post.mood} /> : null}
          <div className="mt-auto flex items-end justify-between gap-3">
            <p className="font-display text-[1.6rem] leading-none">— {who.first}</p>
            <PersonSeal initial={who.initial} size={36} className="-rotate-6" />
          </div>
        </div>

        <AnimatePresence>
          {sent ? (
            <motion.figure
              key="margin"
              initial={{ opacity: 0, y: 10, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: -1.5 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
              className="sheet relative mx-[clamp(1rem,4vw,2rem)] -mt-2 mb-[clamp(1rem,4vw,2rem)] flex items-start gap-3 p-4 sm:col-span-2"
            >
              <PersonSeal initial={me.initial} size={28} className="mt-1" />
              <figcaption className="min-w-0">
                <span className="block text-sm text-ink/65">Your note in {who.first}’s margin</span>
                <span className="mt-1 block text-[1.0625rem] leading-[1.6] text-ink/90">{sent}</span>
              </figcaption>
            </motion.figure>
          ) : null}
        </AnimatePresence>
      </article>

      {sent ? (
        <p role="status" className="mt-5 text-[0.9375rem] text-ink/70">
          Tucked into {who.first}’s margin. Only {who.first} sees it, and there’s no thread to keep up.
        </p>
      ) : (
        <form
          className="mt-7"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) setSent(draft.trim());
          }}
        >
          <label htmlFor={fieldId} className="block font-medium">
            Reply in the margin
          </label>
          <p id={`${fieldId}-hint`} className="mt-1 text-sm text-ink/65">
            One reply per postcard. Only {who.first} sees it.
          </p>
          <textarea
            id={fieldId}
            aria-describedby={`${fieldId}-hint`}
            rows={2}
            maxLength={240}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={post.id === "nani" ? "The correct pan. Noted." : "A line back, in pencil."}
            className="control mt-3 resize-none text-[1.0625rem]"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={!draft.trim()}>
              Tuck it in the margin
            </Button>
            <Button variant="secondary" size="lg" onClick={onBack}>
              Back to the post
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

// ── A first letter from someone new ──────────────────────────────────────────

function NewSenderTray() {
  const ana = person(NEW_SENDER.from);
  const [state, setState] = useState<"waiting" | "open" | "blocked">("waiting");
  return (
    <section aria-labelledby="new-tray" className="mt-12 flex flex-col gap-5 rounded-xs border border-dashed border-ink/25 p-5 sm:flex-row sm:p-7">
      <PersonSeal initial={ana.initial} size={44} state={state === "blocked" ? "resting" : "blank"} />
      <div className="min-w-0 flex-1">
        <h3 id="new-tray" className="font-medium">
          A first letter from someone new
        </h3>
        <p className="mt-1 max-w-2xl text-ink/70">
          {ana.name}, {ana.city}. You haven’t written to each other before, so it waits here, unopened. {NEW_SENDER.note}
        </p>
        <div aria-live="polite">
          {state === "waiting" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setState("open")}>
                Open it
              </Button>
              <Button variant="quiet" onClick={() => setState("blocked")}>
                Block {ana.first}
              </Button>
            </div>
          ) : state === "open" ? (
            <div className="mt-4">
              <blockquote className="max-w-2xl border-l-2 border-ink/20 pl-4 text-[1.0625rem] leading-[1.65] text-ink/85">
                {NEW_SENDER.body}
              </blockquote>
              <p className="mt-3 text-sm text-ink/65">
                {ana.first} can write to you on Sundays now. She still can’t see your postcard unless you approve her.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink/65">
              Blocked. {ana.first} can’t write to you again, and she isn’t told.{" "}
              <button type="button" onClick={() => setState("waiting")} className="link inline-flex min-h-11 items-center font-medium text-ink">
                Undo
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
