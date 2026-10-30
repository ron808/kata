"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import type { Me } from "@/components/lab/cast";
import { MEMORIES, TODAY, type Memory } from "./data";
import { EASE, MoodStamp, Print, Sprig } from "./Pressed";

type Status = "new" | "kept" | "answered" | "resting" | "tender";

/** "29 October 2025" → "October 2025" */
function monthOf(m: Memory) {
  return m.date.split(" ").slice(1).join(" ");
}

export function TodayScreen({ me }: { me: Me }) {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(MEMORIES[0].id);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState(TODAY.draft);
  const [tomorrow, setTomorrow] = useState(TODAY.draft2);
  const focusId = useRef<string | null>(null);

  const memory = MEMORIES.find((m) => m.id === current)!;
  const answered = MEMORIES.filter((m) => status[m.id] === "answered");
  const kept = MEMORIES.filter((m) => status[m.id] === "kept" || status[m.id] === "answered");

  function set(id: string, s: Status | null) {
    setStatus((prev) => {
      const next = { ...prev };
      if (s) next[id] = s;
      else delete next[id];
      return next;
    });
  }

  function answer(m: Memory) {
    focusId.current = m.id;
    set(m.id, "answered");
  }

  useEffect(() => {
    if (!focusId.current) return;
    const el = document.getElementById(`pf-reply-${focusId.current}`) as HTMLTextAreaElement | null;
    focusId.current = null;
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [status, reduce]);

  const words = [draft, tomorrow, ...Object.values(replies)].join(" ").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <article
        aria-labelledby="pf-today-title"
        className="relative bg-surface px-margin pb-12 pt-8 shadow-paper max-sm:-mx-margin sm:rounded-xs sm:px-[clamp(1.75rem,4.5vw,3.25rem)] sm:pt-10"
      >
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-[minmax(0,1fr)_17.5rem] md:grid-rows-[auto_1fr]">
          <header className="rule min-w-0 border-b pb-6 md:col-start-1 md:row-start-1">
              <p className="text-sm text-ink/65">Page {TODAY.page}</p>
              <h2 id="pf-today-title" className="mt-2 font-display text-[clamp(2.6rem,2rem+2.4vw,3.6rem)] leading-[0.95]">
                {TODAY.weekday}
                <span className="block text-[0.55em] text-ink/65">{TODAY.monthDay}</span>
              </h2>
          </header>

          {/* The pressed-flower card, tucked into the page's corner. On phones it sits under the date. */}
          <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:-mr-[clamp(0.5rem,3vw,4.5rem)] md:-mt-12">
            <PressedCard
              memory={memory}
              current={current}
              onPick={setCurrent}
              status={status[memory.id] ?? "new"}
              onKeep={() => set(memory.id, "kept")}
              onAnswer={() => answer(memory)}
              onRest={() => set(memory.id, "resting")}
              onTender={() => set(memory.id, "tender")}
              onUndo={() => set(memory.id, null)}
              statusOf={(id) => status[id] ?? "new"}
            />
          </div>

          <div className="min-w-0 md:col-start-1 md:row-start-2">
            <div className="mt-1 space-y-3">
              <label htmlFor="pf-today-notice" className="block font-display text-prompt text-ink/80">
                {TODAY.prompt}
              </label>
              <Writing id="pf-today-notice" value={draft} onChange={setDraft} placeholder="Write something…" />
            </div>

            <div className="mt-11 space-y-3">
              <label htmlFor="pf-today-tomorrow" className="block font-display text-prompt text-ink/80">
                {TODAY.prompt2}
              </label>
              <Writing id="pf-today-tomorrow" value={tomorrow} onChange={setTomorrow} placeholder="One line is plenty." />
            </div>

            <AnimatePresence initial={false}>
              {answered.map((m) => (
                <motion.section
                  key={m.id}
                  aria-label={`Reply to ${m.date}`}
                  initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="mt-11 space-y-3"
                >
                  <p className="flex items-center gap-2 text-sm text-ink/65">
                    <Sprig className="h-6 w-4 text-ink" />
                    Answering {m.weekday}, {m.date}
                  </p>
                  <blockquote className="rule border-l-2 pl-4 text-[1.0625rem] leading-relaxed text-ink/70">
                    {m.line}
                  </blockquote>
                  <label htmlFor={`pf-reply-${m.id}`} className="block font-display text-prompt text-ink/80">
                    What would you tell that day?
                  </label>
                  <Writing
                    id={`pf-reply-${m.id}`}
                    value={replies[m.id] ?? ""}
                    onChange={(v) => setReplies((r) => ({ ...r, [m.id]: v }))}
                    placeholder={m.id === "y1" ? "Keep the lamp. You’ll still have it." : "Dear last year…"}
                  />
                </motion.section>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <footer className="rule mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm text-ink/65">
          <span>
            <span className="font-medium tabular-nums text-ink">{words}</span> words · written by {me.first}
          </span>
          <span>Only you see what comes back.</span>
        </footer>
      </article>

      <aside aria-labelledby="pf-press-title" className="space-y-10 lg:pt-4">
        <section>
          <h2 id="pf-press-title" className="font-display text-[1.6rem] leading-tight">
            Your press
          </h2>
          <p className="mt-1 text-[0.9375rem] text-ink/70">Days you kept, flat and safe. They come back next year.</p>
          {kept.length === 0 ? (
            <p className="mt-5 rounded-xs border border-dashed border-ink/20 px-4 py-5 text-[0.9375rem] text-ink/65">
              Nothing kept yet. Keep a day and it lives here.
            </p>
          ) : (
            <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-1">
              <AnimatePresence initial={false}>
                {kept.map((m, i) => (
                  <motion.li
                    key={m.id}
                    layout={!reduce}
                    initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className={i % 2 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]"}
                  >
                    <Print scene={m.scene} caption={`${m.date} · ${m.place}`} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section className="rule border-t pt-6">
          <h2 className="font-medium">Quiet dates</h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink/70">
            July and August 2025 are tender. Kata never brings them back, and never lends them.
          </p>
          {MEMORIES.filter((m) => status[m.id] === "tender").map((m) => (
            <p key={m.id} className="mt-2 text-[0.9375rem] text-ink/70">
              {monthOf(m)} is tender too, as you asked today.
            </p>
          ))}
        </section>
      </aside>
    </div>
  );
}

function Writing({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="writing ruled min-h-[calc(var(--rule)*2)]"
    />
  );
}

function PressedCard({
  memory,
  current,
  onPick,
  status,
  statusOf,
  onKeep,
  onAnswer,
  onRest,
  onTender,
  onUndo,
}: {
  memory: Memory;
  current: string;
  onPick: (id: string) => void;
  status: Status;
  statusOf: (id: string) => Status;
  onKeep: () => void;
  onAnswer: () => void;
  onRest: () => void;
  onTender: () => void;
  onUndo: () => void;
}) {
  const reduce = useReducedMotion();
  const away = status === "resting" || status === "tender";

  return (
    <section
      aria-label="Pressed from this date"
      className="relative rounded-xs border border-ink/10 bg-ground p-4 shadow-paper"
    >
      <Sprig className="pointer-events-none absolute -top-7 right-0 h-20 w-14 rotate-[18deg] md:-right-3 text-ink" />
      <div className="flex items-baseline justify-between gap-3 pr-8">
        <h3 className="font-display text-[1.35rem] leading-tight">On this day</h3>
      </div>

      <div role="group" aria-label="Which year" className="mt-3 grid grid-cols-3 gap-1 rounded-md border border-ink/15 p-1">
        {MEMORIES.map((m) => {
          const on = m.id === current;
          const s = statusOf(m.id);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(m.id)}
              className={`relative h-11 rounded-sm px-1 text-[0.8125rem] leading-tight transition-colors duration-300 ${ on ? "bg-ink text-ground" : "text-ink/70 hover:text-ink"
              }`}
            >
              {m.ago.replace(" ago", "")}
              {s !== "new" ? <span className="sr-only"> ({s})</span> : null}
              {s === "kept" || s === "answered" ? (
                <span aria-hidden className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${on ? "bg-ground" : "bg-ink/60"}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={memory.id + (away ? "-away" : "")}
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -6 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {away ? (
            <div className="py-6">
              <p className="font-display text-[1.35rem] leading-snug">
                {status === "tender" ? `${monthOf(memory)} is tender now.` : "Resting."}
              </p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/70">
                {status === "tender"
                  ? "Kata won’t bring back any day from that month, and won’t lend it to anyone."
                  : "This day won’t come back on its own. It’s still in your pages if you go looking."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {status === "resting" ? (
                  <Button variant="secondary" onClick={onTender} className="!h-11 !px-4">
                    Mark the month tender
                  </Button>
                ) : null}
                <Button variant="quiet" onClick={onUndo} className="!h-11 !px-3">
                  Undo
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Print scene={memory.scene} caption={memory.caption} className="mt-4 -rotate-[2deg]" />
              <p className="mt-4 text-sm text-ink/65">
                {memory.weekday}, {memory.date} · {memory.place}
              </p>
              <p className="mt-1.5 text-[1.0625rem] leading-relaxed text-ink/90">“{memory.line}”</p>
              <MoodStamp mood={memory.mood} className="mt-3" />

              {status === "new" ? (
                <div className="mt-5 grid grid-cols-[1fr_1fr] gap-2">
                  <Button onClick={onAnswer} className="col-span-2">
                    <Icon name="pen" className="h-4 w-4" />
                    Answer
                  </Button>
                  <Button variant="secondary" onClick={onKeep} className="!px-3">
                    Keep
                  </Button>
                  <Button variant="quiet" onClick={onRest} className="!px-3">
                    Let it rest
                  </Button>
                </div>
              ) : (
                <div className="rule mt-5 flex items-center justify-between gap-2 border-t pt-3">
                  <p className="flex items-center gap-2 text-[0.9375rem] text-ink">
                    <Icon name="check" className="h-4 w-4" />
                    {status === "answered" ? "Answered on today’s page" : "Kept in your press"}
                  </p>
                  <Button variant="quiet" onClick={onUndo} className="!h-11 !px-3">
                    Undo
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
