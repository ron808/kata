"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/Icon";
import { MaruMark } from "@/components/shared/Avatar";
import { ASK_EVENT, REPLIED_EVENT, useCompanion, type Focus, type Replied } from "@/components/shared/Companion";
import { postsInView } from "@/components/shared/screen";
import { setTheme } from "@/components/shared/ThemeToggle";
import { useToast } from "@/components/shared/Toast";
import { saidFor } from "@/lib/companion/forms";
import type { ClientAction } from "@/lib/companion/tools";
import type { KataMessage, ThreadT } from "@/lib/types";
import { Choices, Receipts } from "./Work";

// Short to fit one row in the panel; each says the whole request.
const PROMPTS: [label: string, says: string][] = [
  ["Suggest replies", "Suggest replies to this post"],
  ["Your take", "What do you think of this post?"],
  ["Remind me", "Remind me to reply to this later"],
];

const MOOD_LABELS = ["Foggy", "Low", "Okay", "Good", "Bright"];

/** The morning mood check, or the evening "How did today go?", which offers the same five steps. */
function asksMood(m: KataMessage) {
  return m.kind === "mood" || (m.replies.length === 5 && m.replies.every((r) => /^[1-5]$/.test(r.value)));
}

/** Five steps drawn as dots, so moods don't lean on emoji. */
function MoodDots({ value }: { value: number }) {
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-[5px] w-[5px] rounded-full bg-current" style={{ opacity: i <= value ? 1 : 0.22 }} />
      ))}
    </span>
  );
}

/**
 * Today's conversation with Maru: its check-ins with quick replies, the mood check and a
 * line to tell it anything. Each answer comes back with Maru's reply, the updated threads
 * and anything the browser should do (open a page, switch theme, refresh what's on screen).
 * The card keeps its size (as tall as the map beside it on home, the dock's height elsewhere):
 * the conversation scrolls inside it, opens at the newest line, and the composer stays put.
 */
export function Conversation({
  initial,
  onThreads,
  checkInLine,
  moodWeek,
  today,
  ai,
  where,
  dock,
  initialFocus,
}: {
  initial: KataMessage[];
  onThreads?: (threads: ThreadT[]) => void;
  checkInLine: string;
  /** The last seven days' moods, oldest first; today is last. */
  moodWeek: (number | null)[];
  /** The writer's local day, yyyy-mm-dd: the last of `moodWeek`. */
  today: string;
  /** Replies come from a language model (say so under the composer). */
  ai: boolean;
  /** The page the writer is on, so Maru knows what "this" is. */
  where?: string;
  /** In the dock over another page: fills its panel, can be closed, and hears when Maru opens a page. */
  dock?: { onClose: () => void; onNavigate?: () => void };
  /** The post it was opened from, if any. */
  initialFocus?: Focus | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { name } = useCompanion();
  const [messages, setMessages] = useState(initial);
  const [week, setWeek] = useState(moodWeek);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<{ id: string; index: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [focus, setFocus] = useState<Focus | null>(initialFocus ?? null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const acted = useRef(false);
  const inputId = dock ? "tell-maru-dock" : "tell-maru";

  // "Ask Maru" on a post: this conversation takes it up, and the composer is ready.
  useEffect(() => {
    const onAsk = (e: Event) => {
      setFocus((e as CustomEvent<Focus>).detail);
      requestAnimationFrame(() => {
        input.current?.focus({ preventScroll: true });
        if (!dock) input.current?.closest("section")?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, [dock]);

  function perform(actions: ClientAction[]) {
    for (const a of actions) {
      if (a.type === "theme") setTheme(a.value);
      // Today's page, if it's open, adds the same words so its next autosave keeps them.
      else if (a.type === "page-write") window.dispatchEvent(new CustomEvent("maru:page-write", { detail: a }));
      // The post on screen shows the reply under it at once.
      else if (a.type === "replied") window.dispatchEvent(new CustomEvent<Replied>(REPLIED_EVENT, { detail: { momentId: a.momentId, reply: a.reply, count: a.count } }));
    }
    const go = actions.find((a) => a.type === "navigate");
    if (go?.type === "navigate") {
      dock?.onNavigate?.();
      router.push(go.href);
    } else if (actions.some((a) => a.type === "refresh")) router.refresh();
  }

  // Keep the newest line in view inside the card: at once on first paint, gently after you
  // act. Only the conversation scrolls, never the page.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const smooth = acted.current && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, [messages, busy]);

  async function send(
    body:
      | { messageId: string; value: string; edit?: string; inputs?: Record<string, string>; screen?: string[]; here?: string; focus?: string }
      | { text: string; screen?: string[]; here?: string; focus?: string },
    optimistic: KataMessage
  ) {
    acted.current = true;
    setBusy(true);
    const before = messages;
    setMessages((ms) => [
      ...ms.map((m) => ("messageId" in body && m._id === body.messageId ? { ...m, answer: body.value } : m)),
      optimistic,
    ]);
    try {
      const res = await fetch("/api/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, where }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        messages?: KataMessage[];
        threads?: ThreadT[];
        actions?: ClientAction[];
        error?: string;
      };
      if (!res.ok || !data.messages) throw new Error(data.error ?? `${name} couldn’t take that just now. Try again.`);
      setMessages((ms) => [...ms.filter((m) => m._id !== optimistic._id), ...data.messages!]);
      if (data.threads) onThreads?.(data.threads);
      if (data.actions?.length) perform(data.actions);
    } catch (err) {
      setMessages(before);
      toast(err instanceof Error ? err.message : "Something went wrong", "danger");
    } finally {
      setBusy(false);
      setRunning(null);
    }
  }

  function reply(m: KataMessage, value: string, label: string) {
    if (busy || m.answer) return;
    const mood = asksMood(m) ? Number(value) : null;
    if (mood) setWeek((w) => [...w.slice(0, -1), mood]);
    // A tapped answer to Maru ("Draft replies to Arjun") is said, like typing it, so it sees the screen too.
    send({ messageId: m._id, value, ...(value.startsWith("say:") ? seenNow() : {}) }, mine(label, mood));
  }

  /** The post they asked from, or the posts in view by id (the server reads them, and only when the words are about them). */
  function seenNow(): { focus?: string; screen?: string[]; here?: string } {
    if (focus) return { focus: focus.id };
    const view = postsInView();
    return { ...(view.ids.length ? { screen: view.ids } : {}), ...(view.here ? { here: view.here } : {}) };
  }

  /** A tap on one of Maru's choices runs it (with what its form was filled in with); no model, no wait for words. */
  function choose(m: KataMessage, index: number | "no", edit?: string, inputs?: Record<string, string>) {
    if (busy || m.answer) return;
    if (index !== "no") setRunning({ id: m._id, index });
    const label = index === "no" ? "Not now" : saidFor(m.choices[index], inputs);
    send({ messageId: m._id, value: `do:${index}`, ...(edit ? { edit } : {}), ...(inputs ? { inputs } : {}) }, mine(label, null));
  }

  function say(text: string) {
    if (!text || busy) return;
    send({ text, ...seenNow() }, mine(text, null));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    say(text);
  }

  return (
    <section
      aria-labelledby={dock ? "maru-dock-heading" : "kata-heading"}
      className={
        dock
          ? "card flex h-full min-h-0 flex-col p-4 sm:p-5"
          : "card flex min-h-0 flex-col p-4 max-lg:max-h-[min(46rem,82svh)] sm:p-6 lg:max-h-[calc(100svh-2.5rem)] lg:flex-1"
      }
    >
      <header className="flex shrink-0 items-center gap-3">
        <MaruMark size={dock ? 38 : 42} />
        <div className="min-w-0 flex-1">
          <h2 id={dock ? "maru-dock-heading" : "kata-heading"} className="font-semibold leading-tight">
            {name}
          </h2>
          <p className="truncate text-[0.8125rem] text-ink/65">{dock ? "Ask me to change anything" : checkInLine}</p>
        </div>
        {dock ? (
          <button
            type="button"
            onClick={dock.onClose}
            aria-label={`Close ${name}`}
            className="-mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        ) : (
          <MoodWeek week={week} today={today} />
        )}
      </header>

      <div
        ref={scroller}
        tabIndex={0}
        aria-label={`Conversation with ${name}`}
        className={`-mx-2 mt-4 flex-1 overflow-y-auto overscroll-contain rounded-md px-2 py-1 [scrollbar-width:thin] ${dock ? "min-h-20" : "min-h-[12rem]"}`}
      >
        <ol className="space-y-3.5" aria-live="polite" aria-relevant="additions">
          {messages.map((m) => {
            if (m.from === "you") {
              return (
                <li key={m._id} className="appear flex justify-end">
                  <p className="bubble-you max-w-[32ch] px-4 py-2.5 font-medium">{m.text}</p>
                </li>
              );
            }
            const open = !m.answer;
            return (
              <li key={m._id} className="appear flex flex-col items-start gap-2.5">
                {m.text ? <KataText text={m.text} /> : null}
                {m.done.length ? <Receipts done={m.done} /> : null}
                {m.choices.length ? (
                  <Choices message={m} running={running?.id === m._id ? running.index : null} onChoose={(i, edit, inputs) => choose(m, i, edit, inputs)} />
                ) : null}
                {asksMood(m) ? (
                  <div className="scale w-full max-w-[27rem]" role="group" aria-label="Mood">
                    {m.replies.map((r, j) => (
                      <button
                        key={r.value}
                        type="button"
                        className="scale-step"
                        aria-pressed={m.answer === r.value}
                        disabled={!open && m.answer !== r.value}
                        onClick={() => reply(m, r.value, r.label)}
                      >
                        <MoodDots value={Number(r.value) || j + 1} />
                        {r.label || MOOD_LABELS[j]}
                      </button>
                    ))}
                  </div>
                ) : m.replies.length ? (
                  <div className="flex flex-wrap gap-2">
                    {m.replies.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className="chip"
                        aria-pressed={m.answer === r.value}
                        disabled={!open && m.answer !== r.value}
                        onClick={() => reply(m, r.value, r.label)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
          {busy ? (
            <li className="flex">
              <span className="bubble-kata px-4 py-3.5">
                <span className="typing" role="status" aria-label={`${name} is on it`}>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </li>
          ) : null}
        </ol>
      </div>

      <div className="rule mt-3 shrink-0 border-t-2 pt-4">
        {focus ? (
          <div className="appear mb-3">
            <div className="well flex items-center gap-2.5 py-1.5 pl-3 pr-1">
              <Icon name="eye" className="h-4 w-4 shrink-0 text-ink/65" />
              <p className="min-w-0 flex-1 truncate text-[0.875rem]">
                <span className="font-semibold">{focus.label}</span>
                <span className="text-ink/65"> · “{focus.text}”</span>
              </p>
              <button
                type="button"
                onClick={() => setFocus(null)}
                aria-label={`Stop looking at ${focus.label}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/65 transition-colors hover:bg-ink/[0.06] hover:text-ink"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROMPTS.map(([label, says]) => (
                <button key={label} type="button" className="chip chip-sm" disabled={busy} onClick={() => say(says)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Tell {name} anything
          </label>
          <input
            id={inputId}
            ref={input}
            className="control !min-h-12 !rounded-full"
            placeholder={focus ? `Ask about ${focus.label}` : dock ? `Ask ${name} anything` : `Tell ${name} what’s on your mind`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            autoComplete="off"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || !draft.trim()}
            className="press grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-edge bg-accent text-on-accent transition-[transform,box-shadow,opacity] duration-300 disabled:opacity-50"
          >
            <Icon name="send" className="h-5 w-5" />
          </button>
        </form>
        {ai ? <p className="mt-2.5 px-1 text-[0.75rem] text-ink/65">{name}’s replies are written by AI and can be wrong.</p> : null}
      </div>
    </section>
  );
}

/** Kata's words: a plan or a list arrives as lines; stray markdown is dropped. */
function KataText({ text }: { text: string }) {
  const lines = text.replace(/\*\*|__/g, "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return <p className="bubble-kata max-w-[38ch] px-4 py-3 text-[1.0125rem] leading-snug">{lines[0]}</p>;
  return (
    <div className="bubble-kata max-w-[40ch] px-4 py-3 text-[1.0125rem] leading-snug">
      {lines.map((l, i) =>
        /^[-•*]\s+/.test(l) ? (
          <p key={i} className="flex gap-2 [&+p]:mt-1.5">
            <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
            <span>{l.replace(/^[-•*]\s+/, "")}</span>
          </p>
        ) : (
          <p key={i} className="[&+p]:mt-1.5">
            {l}
          </p>
        )
      )}
    </div>
  );
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Your week of moods as seven stickers, filled deeper for brighter days. */
function MoodWeek({ week, today: day }: { week: (number | null)[]; today: string }) {
  const known = week.filter((v): v is number => v !== null);
  if (!known.length) return null;
  // From the writer's day, not the clock, so server and browser agree.
  const today = new Date(`${day}T00:00:00Z`).getUTCDay();
  const label = `Mood this week: ${week.map((v) => (v ? MOOD_LABELS[v - 1] : "no answer")).join(", ")}`;
  return (
    <div role="img" aria-label={label} className="hidden shrink-0 items-end gap-1 sm:flex">
      {week.map((v, i) => {
        const day = (today - (6 - i) + 7) % 7;
        return (
          <span key={i} className="grid justify-items-center gap-1">
            <span
              className="h-4 w-4 rounded-full border-2 border-edge"
              style={{ background: v ? `color-mix(in oklab, var(--sun) ${30 + v * 14}%, var(--surface))` : "transparent", opacity: v ? 1 : 0.35 }}
            />
            <span aria-hidden className="text-[0.6875rem] font-semibold leading-none text-ink/55">
              {DAY_LETTERS[(day + 6) % 7]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

let tempId = 0;
function mine(text: string, mood: number | null): KataMessage {
  return {
    _id: `pending-${++tempId}`,
    from: "you",
    kind: mood ? "mood" : "note",
    text,
    threadId: null,
    replies: [],
    answer: null,
    mood,
    done: [],
    choices: [],
    createdAt: new Date().toISOString(),
  };
}
