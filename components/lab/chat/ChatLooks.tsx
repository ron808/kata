"use client";

import { useState, type MouseEvent } from "react";
import { MaruMark } from "@/components/shared/Avatar";
import { useCompanion } from "@/components/shared/Companion";
import { Choices, Receipts } from "@/components/home/Work";
import { CheckIn, ThreadPiece } from "@/components/maru/Pieces";
import { stepSaid, stepsFor } from "@/lib/companion/steps";
import type { KataMessage, Receipt, ThreadStatus, ThreadT } from "@/lib/types";

/*
 * The same conversation in three looks, drawn by the real pieces (CheckIn, ThreadPiece, Receipts,
 * Choices) with only their skin changed by [data-look]. Taps work on demo data in this browser
 * only: nothing is saved, and no model is involved, as with the real pieces.
 */

const LOOKS = [
  { id: "patches", name: "Patches", says: "Each thread is a soft patch of its colour; what's done is a quieter patch." },
  { id: "stickers", name: "Stickers", says: "Each thread is an outlined sticker with a strip of its colour; what's done is a stamp." },
  { id: "quiet", name: "Quiet", says: "A line of colour down the side, and answers in one row: closest to a plain chat." },
] as const;
type Look = (typeof LOOKS)[number]["id"];

const day = new Date().toISOString().slice(0, 10);
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const thread = (o: Partial<ThreadT> & Pick<ThreadT, "_id" | "title" | "kind" | "hue">): ThreadT => ({
  status: "moving",
  nextStep: "",
  lastNote: "",
  dueAt: null,
  tags: [],
  log: [],
  streak: 0,
  lastTouchedAt: at(1),
  touchCount: 3,
  archived: false,
  shared: false,
  fields: [],
  createdAt: at(8),
  ...o,
} as ThreadT);

const START: ThreadT[] = [
  thread({ _id: "demo-scrapers", title: "Finish scrapers", kind: "project", hue: 0, dueAt: `${day}T00:00:00.000Z` }),
  thread({ _id: "demo-water", title: "Drink water", kind: "habit", hue: 1, lastTouchedAt: at(5), streak: 1 }),
  thread({ _id: "demo-visa", title: "Visa paperwork", kind: "task", hue: 2, status: "waiting", lastNote: "the embassy", lastTouchedAt: at(2) }),
];

const kata = (id: string, o: Partial<KataMessage>): KataMessage => ({ _id: id, from: "kata", kind: "reply", text: "", threadId: null, replies: [], answer: null, mood: null, done: [], choices: [], createdAt: at(0), ...o });
const you = (id: string, text: string): KataMessage => ({ ...kata(id, { text }), from: "you" });

const MESSAGES: KataMessage[] = [
  kata("m1", {
    kind: "checkin",
    text: "Any word on the visa paperwork from the embassy?",
    threadId: "demo-visa",
    replies: [{ label: "It came through", value: "moving" }, { label: "Still waiting", value: "waiting" }, { label: "Done", value: "done" }, { label: "Not now", value: "later" }],
  }),
  you("y1", "how we doing today?"),
  kata("m3", {
    text: "Finish scrapers is due today and Drink water isn’t done yet today.",
    choices: ["demo-scrapers", "demo-water"].map((id) => ({ label: START.find((t) => t._id === id)!.title, detail: "", kind: "thread", editable: false, public: false, inputs: [], action: "", max: 0, thread: id })),
  }),
  kata("m4", {
    text: "Want me to keep track of it?",
    choices: [
      { label: "Keep track of “Morning run”", detail: "habit · tracks minutes", kind: "thread", editable: false, public: false, inputs: [], action: "", max: 0, thread: null },
      { label: "Open Threads", detail: "", kind: "open", editable: false, public: false, inputs: [], action: "", max: 0, thread: null },
    ],
  }),
];

const receipt = (t: ThreadT, step: ThreadStatus): Receipt => ({ kind: "thread", text: stepSaid(t, step), detail: t.kind === "habit" && step === "done" ? "Day one" : "", href: null, hue: t.hue });

export function ChatLooks() {
  const { name } = useCompanion();
  const [look, setLook] = useState<Look>("patches");
  const [threads, setThreads] = useState(START);
  const [messages, setMessages] = useState(MESSAGES);
  const byId = new Map(threads.map((t) => [t._id, t]));
  const newest = new Map<string, string>();
  for (const m of messages) for (const id of [m.kind === "checkin" ? m.threadId : null, ...m.choices.map((c) => c.thread)]) if (id) newest.set(id, m._id);

  // What the server would do, done here: the thread moves, and Maru says what changed.
  function set(t: ThreadT, step: ThreadStatus, label: string, answering?: string) {
    const after: ThreadT =
      t.kind === "habit" && step === "done" ? { ...t, streak: t.streak + 1, lastTouchedAt: new Date().toISOString() } : t.kind === "habit" && step === "moving" ? { ...t, streak: Math.max(0, t.streak - 1), lastTouchedAt: at(1) } : { ...t, status: step };
    setThreads((ts) => ts.map((x) => (x._id === t._id ? after : x)));
    const n = messages.length;
    setMessages((ms) => [
      ...ms.map((m) => (m._id === answering ? { ...m, answer: step } : m)),
      you(`y-${n}`, `${t.title}: ${label}`),
      kata(`k-${n}`, {
        done: [receipt(after, step)],
        choices: step === "stuck" ? [{ label: "What’s in the way?", detail: "", kind: "thread", editable: false, public: false, inputs: [{ key: "note", label: "What’s in the way?", type: "text", value: "", options: [], required: true, unit: "", placeholder: "Waiting on access, not sure where to start" }], action: "Save", max: 0, thread: null }] : [],
      }),
    ]);
  }

  // Links in the demo go nowhere: the threads aren't real.
  const stay = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) e.preventDefault();
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <div role="radiogroup" aria-label="Look" className="flex flex-wrap gap-2">
        {LOOKS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={look === l.id} className="chip" onClick={() => setLook(l.id)}>
            {l.name}
          </button>
        ))}
        <button type="button" className="chip" onClick={() => (setThreads(START), setMessages(MESSAGES))}>
          Start over
        </button>
      </div>
      <p className="text-[0.9375rem] text-ink/75">{LOOKS.find((l) => l.id === look)!.says}</p>
      <section className="card max-w-[34rem] p-4 sm:p-6" data-look={look} onClickCapture={stay} aria-label={`${name}, in the ${look} look`}>
        <header className="flex items-center gap-3">
          <MaruMark size={42} />
          <p className="font-semibold">{name}</p>
        </header>
        <ol className="mt-4 space-y-3.5">
          {messages.map((m) =>
            m.from === "you" ? (
              <li key={m._id} className="appear flex justify-end">
                <p className="bubble-you max-w-[32ch] px-4 py-2.5 font-medium">{m.text}</p>
              </li>
            ) : (
              <li key={m._id} className="appear flex flex-col items-start gap-2.5">
                {m.text ? <p className="bubble-kata max-w-[38ch] px-4 py-3 text-[1.0125rem] leading-snug">{m.text}</p> : null}
                {m.done.length ? <Receipts done={m.done} /> : null}
                {m.kind === "checkin" && m.threadId ? (
                  <div className="w-full max-w-[26rem]">
                    <CheckIn
                      message={m}
                      thread={byId.get(m.threadId) ?? null}
                      today={day}
                      tz="UTC"
                      live={newest.get(m.threadId) === m._id}
                      busy={false}
                      onAnswer={(value, label) => {
                        const t = byId.get(m.threadId!)!;
                        if (value === "later") setMessages((ms) => ms.map((x) => (x._id === m._id ? { ...x, answer: "later" } : x)));
                        else set(t, value as ThreadStatus, label, m._id);
                      }}
                    />
                  </div>
                ) : null}
                {m.choices.some((c) => c.thread) ? (
                  <div className="grid w-full max-w-[26rem] grid-cols-1 gap-2">
                    {m.choices.map((c, i) =>
                      c.thread ? (
                        <ThreadPiece
                          key={i}
                          thread={byId.get(c.thread) ?? null}
                          today={day}
                          tz="UTC"
                          live={newest.get(c.thread) === m._id}
                          pending={null}
                          busy={false}
                          onStep={(step, label) => set(byId.get(c.thread!)!, step, label)}
                        />
                      ) : null
                    )}
                  </div>
                ) : null}
                {m.choices.some((c) => !c.thread) ? (
                  <Choices
                    message={m}
                    running={null}
                    onChoose={(i) => setMessages((ms) => ms.map((x) => (x._id === m._id ? { ...x, answer: `do:${i}` } : x)))}
                  />
                ) : null}
              </li>
            )
          )}
        </ol>
      </section>
      <p className="text-[0.875rem] text-ink/70">
        Tap anything: answers, steps ({stepsFor("project", { paused: false }).map((s) => s.label).join(", ")}), and the buttons at the end. Nothing here is saved.
      </p>
    </div>
  );
}
