"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { MaruMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { AddTask, TaskList } from "@/components/missions/Tasks";
import { useMission } from "@/components/missions/useMission";
import { clock, focusedFor, isOpen, leftOn, nextUp, spentOn, tally } from "@/lib/missions/core";
import { promptFor, type PromptAnswer } from "@/lib/missions/prompts";
import type { FocusTheme, MissionT, TaskT } from "@/lib/types";
import { chime, wakeSound } from "./chime";
import { focusChanged } from "./mode";
import { useClock } from "./useClock";

const THEMES: { value: FocusTheme; label: string; colour: string }[] = [
  { value: "sea", label: "Deep sea", colour: "#5cc8ff" },
  { value: "moss", label: "Moss", colour: "#5fe3a1" },
  { value: "ember", label: "Ember", colour: "#ff9466" },
];

const TIMERS = [15, 25, 45];
const SOUND_KEY = "kata-focus-sound";

const listeners = new Set<() => void>();

function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function saveSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: no memory of it, and no way to turn it off for good.
  }
  listeners.forEach((l) => l());
}

function onSound(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The big clock: what's left on the task's timer, or how long it's been going. */
function BigClock({ task, mission, now }: { task: TaskT | null; mission: MissionT; now: number }) {
  const left = task ? leftOn(task, now) : null;
  const over = left !== null && left < 0;
  const shown = task ? (left !== null ? Math.abs(left) : spentOn(task, now)) : focusedFor(mission, now);
  const share = task?.minutes ? Math.min(1, spentOn(task, now) / (task.minutes * 60_000)) : null;
  const label = !task ? "in focus" : over ? "over time" : task.minutes ? `of ${task.minutes} min` : task.startedAt ? "and counting" : shown ? "so far" : "ready when you are";
  return (
    <div className="mt-[clamp(1.25rem,4svh,2.5rem)]">
      <p role="timer" className={`font-display text-[clamp(4.25rem,24vw,10rem)] leading-[0.9] tabular-nums ${over ? "text-accent" : ""}`}>
        {clock(shown)}
      </p>
      <p className="mt-3 text-[0.9375rem] font-medium text-ink/70">{label}</p>
      {share !== null ? (
        <span aria-hidden className="mt-3 block h-2 max-w-[28rem] overflow-clip rounded-full bg-ink/15">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} />
        </span>
      ) : null}
    </div>
  );
}

/** Maru's question, from the clock: it's about what they're doing, and nothing else. */
function Question({ text, answers, busy, onAnswer, onLater }: { text: string; answers: PromptAnswer[]; busy: boolean; onAnswer: (a: PromptAnswer) => void; onLater: () => void }) {
  return (
    <div role="status" className="appear mt-8 flex items-start gap-3">
      <MaruMark size={40} />
      <div className="min-w-0">
        <p className="bubble-kata w-fit max-w-[38ch] px-4 py-3 text-[1.0125rem] leading-snug">{text}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {answers.map((a) => (
            <button key={a.label} type="button" className="chip" disabled={busy} onClick={() => onAnswer(a)}>
              {a.label}
            </button>
          ))}
          <button type="button" className="chip" disabled={busy} onClick={onLater}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

/** What's in the way, in their words, kept on the task. */
function StuckNote({ title, onSave, onCancel, busy }: { title: string; onSave: (note: string) => void; onCancel: () => void; busy: boolean }) {
  const [note, setNote] = useState("");
  const { name } = useCompanion();
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave(note.trim());
  }
  return (
    <form onSubmit={submit} className="appear mt-8 flex items-start gap-3">
      <MaruMark size={40} title={name} />
      <div className="min-w-0 flex-1">
        <label htmlFor="stuck-note" className="bubble-kata block w-fit px-4 py-3 text-[1.0125rem] leading-snug">
          What’s in the way on {title}?
        </label>
        <input id="stuck-note" autoFocus className="control mt-2.5" maxLength={200} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} placeholder="In a few words" />
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" className="!h-11" disabled={busy}>
            Save it
          </Button>
          <Button variant="quiet" size="sm" className="!h-11" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * Focus: one thing, one clock, and the next few things, in the mission's own colours. Maru asks
 * from the clock while Kata is open (a timer ran out, a task's time came, it's been a while),
 * and an answer is saved on the mission. Everything lives on the server, so closing the tab
 * loses nothing: running clocks are stored as when they started.
 */
export function FocusScreen({ mission, theme: initialTheme }: { mission: MissionT; theme: FocusTheme }) {
  const router = useRouter();
  const { mission: m, act, busy } = useMission(mission);
  const now = useClock(m.now);
  const [theme, setTheme] = useState(initialTheme);
  const [all, setAll] = useState(false);
  const [stuckOn, setStuckOn] = useState<TaskT | null>(null);
  const sound = useSyncExternalStore(onSound, soundOn, () => true);
  const addInput = useRef<HTMLInputElement | null>(null);
  const rung = useRef<string | null>(null);

  const up = nextUp(m.tasks, now);
  const running = up?.startedAt ? up : null;
  const { done, total, left } = tally(m.tasks);
  const others = m.tasks.filter((t) => isOpen(t) && t.id !== up?.id);
  const prompt = stuckOn ? null : promptFor(m, now);
  const promptKey = prompt?.key ?? null;
  const ringing = Boolean(prompt?.ring);

  // The tab shows the clock, so it can be seen from another window.
  useEffect(() => {
    const before = document.title;
    return () => {
      document.title = before;
    };
  }, []);
  useEffect(() => {
    const timer = up ? (leftOn(up, now) ?? spentOn(up, now)) : focusedFor(m, now);
    document.title = `${clock(Math.abs(timer))} · ${up?.title ?? m.name}`;
  }, [now, up, m]);

  // One chime for each thing that comes due, however often the page redraws.
  useEffect(() => {
    if (!promptKey || !ringing || rung.current === promptKey) return;
    rung.current = promptKey;
    if (soundOn()) chime();
  }, [promptKey, ringing]);

  function wake() {
    wakeSound();
  }

  async function finish() {
    const ended = await act({ do: "finish" });
    if (!ended) return;
    focusChanged({ on: false });
    router.push(`/missions/${ended._id}`);
    router.refresh();
  }

  function answer(a: PromptAnswer) {
    wake();
    switch (a.do) {
      case "start":
      case "done":
      case "skip":
        return act({ do: a.do, task: a.task });
      case "more":
        return act({ do: "more", task: a.task, minutes: a.minutes });
      case "later": {
        const later = new Date(now + 30 * 60_000).toTimeString().slice(0, 5);
        return act({ do: "edit", task: a.task, at: later });
      }
      case "stuck":
        return setStuckOn(m.tasks.find((t) => t.id === a.task) ?? null);
      case "still":
        return act({ do: "still" });
      case "wrap":
        return finish();
      case "add":
        return addInput.current?.focus();
      case "extend":
        return act({ do: "ends", until: null, more: a.minutes }).then(() => router.refresh());
    }
  }

  function pickTheme(next: FocusTheme) {
    setTheme(next);
    focusChanged({ theme: next });
    void fetch("/api/settings/kata", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focusTheme: next }) });
  }

  function toggleSound() {
    wake();
    saveSound(!sound);
  }

  return (
    <div onPointerDownCapture={wake} className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-[46rem] flex-col px-margin pb-28 pt-[clamp(1.25rem,5svh,4rem)]">
      <section aria-labelledby="focus-now">
        <p className="text-[0.9375rem] font-medium text-ink/70">
          {total ? `${done} of ${total} done` : "Just the clock"}
          {up?.atText ? ` · ${up.atText}` : ""}
        </p>
        <h1 id="focus-now" className="mt-2 font-display text-display-m [overflow-wrap:anywhere]">
          {up ? up.title : total ? "That’s the list" : "Focus"}
        </h1>
        {up?.note ? <p className="mt-2 max-w-[60ch] text-ink/75 [overflow-wrap:anywhere]">{up.status === "stuck" ? `Stuck: ${up.note}` : up.note}</p> : null}

        <BigClock task={up} mission={m} now={now} />

        {up ? (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {running ? (
                <>
                  <Button size="lg" disabled={busy} onClick={() => act({ do: "done", task: up.id })}>
                    <Icon name="check" className="h-5 w-5" strokeWidth={2.4} />
                    Done
                  </Button>
                  <Button size="lg" variant="secondary" disabled={busy} onClick={() => act({ do: "pause" })}>
                    <Icon name="pause" className="h-5 w-5" strokeWidth={2.4} />
                    Pause
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" disabled={busy} onClick={() => act({ do: "start", task: up.id })}>
                    <Icon name="play" className="h-5 w-5" strokeWidth={2.2} />
                    {up.spentMs ? "Carry on" : "Start"}
                  </Button>
                  <Button size="lg" variant="secondary" disabled={busy} onClick={() => act({ do: "done", task: up.id })}>
                    <Icon name="check" className="h-5 w-5" strokeWidth={2.4} />
                    Done
                  </Button>
                </>
              )}
              {/* The two quiet ones go together, so a narrow screen doesn't leave one on its own. */}
              <span className="flex items-center gap-1">
                <Button variant="quiet" disabled={busy} onClick={() => setStuckOn(up)}>
                  Stuck
                </Button>
                <Button variant="quiet" disabled={busy} onClick={() => act({ do: "skip", task: up.id })}>
                  Skip
                </Button>
              </span>
            </div>
            {/* A question on screen has its own answers, so this steps aside. */}
            {prompt ? null : (
              <div role="group" aria-label="Timer" className="mt-4 flex flex-wrap items-center gap-2">
                {!up.minutes ? (
                  TIMERS.map((n) => (
                    <button key={n} type="button" className="chip chip-sm" disabled={busy} onClick={() => act({ do: "edit", task: up.id, minutes: n })}>
                      {n} min timer
                    </button>
                  ))
                ) : running || up.spentMs ? (
                  <button type="button" className="chip chip-sm" disabled={busy} onClick={() => act({ do: "more", task: up.id, minutes: 15 })}>
                    15 more minutes
                  </button>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </section>

      {stuckOn ? (
        <StuckNote
          title={stuckOn.title}
          busy={busy}
          onCancel={() => setStuckOn(null)}
          onSave={(note) => {
            void act({ do: "stuck", task: stuckOn.id, ...(note ? { note } : {}) });
            setStuckOn(null);
          }}
        />
      ) : prompt ? (
        <Question key={prompt.key} text={prompt.text} answers={prompt.answers} busy={busy} onAnswer={answer} onLater={() => act({ do: "still" })} />
      ) : null}

      <section aria-labelledby="focus-next" className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 id="focus-next" className="text-[0.9375rem] font-semibold text-ink/70">
            {all ? "Everything" : left > 1 ? "Up next" : "The list"}
          </h2>
          {total > 1 ? (
            <button type="button" className="link text-[0.875rem] font-semibold" aria-expanded={all} onClick={() => setAll((a) => !a)}>
              {all ? "Show less" : `Show all ${total}`}
            </button>
          ) : null}
        </div>
        <div className="mt-2">
          {all ? (
            <TaskList tasks={m.tasks} now={now} act={act} busy={busy} compact />
          ) : others.length ? (
            <TaskList tasks={others.slice(0, 2)} now={now} act={act} busy={busy} compact />
          ) : null}
        </div>
        <div className="mt-3">
          <AddTask id="focus-add" act={act} busy={busy} focusRef={addInput} />
        </div>
      </section>

      <footer className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-12">
        <div role="radiogroup" aria-label="Focus colours" className="flex flex-wrap items-center gap-2">
          {THEMES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={theme === t.value} className="chip chip-sm" onClick={() => pickTheme(t.value)}>
              <span aria-hidden className="h-3.5 w-3.5 rounded-full border-[1.5px] border-edge" style={{ background: t.colour }} />
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="chip chip-sm" aria-pressed={sound} onClick={toggleSound}>
          <Icon name="sound" className="h-4 w-4" />
          Sound
        </button>
        <Button variant="quiet" size="sm" className="!h-11 ml-auto max-sm:ml-0" disabled={busy} onClick={finish}>
          Wrap it up
        </Button>
      </footer>
    </div>
  );
}
