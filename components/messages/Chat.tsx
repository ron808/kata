"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import type { DirectMessageT, ThreadOpenT } from "@/lib/types";

const MAX = 2000;
/** Sent when a conversation changes here, so the list beside it catches up. */
export const CHANGED_EVENT = "kata:messages";
// New messages are fetched this often while the conversation is on screen.
const POLL = 4000;

/** Messages in time order, each once. */
function merge(a: DirectMessageT[], b: DirectMessageT[]): DirectMessageT[] {
  const byId = new Map([...a, ...b].map((m) => [m._id, m]));
  return [...byId.values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
}

// Days and times in the writer's own timezone, so the server and the browser draw the same thing.
const dayKey = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });

function dayLabel(iso: string, tz: string): string {
  const day = dayKey(iso, tz);
  const now = Date.now();
  if (day === dayKey(new Date(now).toISOString(), tz)) return "Today";
  if (day === dayKey(new Date(now - 86_400_000).toISOString(), tz)) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
}

const clock = (iso: string, tz: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

/**
 * One conversation: their messages in their hue, yours in sun, a box to write in, and new
 * messages as they arrive. If you can't write (blocked, a private profile, no handle yet),
 * the box says why instead.
 */
export function Chat({ initial, draft = "", tz }: { initial: ThreadOpenT; draft?: string; tz: string }) {
  const { toast } = useToast();
  const id = useId();
  const person = initial.person;
  const first = person.name.split(/\s+/)[0] || person.name;
  const [messages, setMessages] = useState(initial.messages);
  const [more, setMore] = useState(initial.more);
  const [closed, setClosed] = useState(initial.closed);
  const [blocked, setBlocked] = useState(initial.blocked);
  const [text, setText] = useState(draft.slice(0, MAX));
  const [sending, setSending] = useState(false);
  const [arming, setArming] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Scroll to the newest line when one arrives, unless they've scrolled up to read.
  const pinned = useRef(true);
  const keepFrom = useRef<number | null>(null);
  const latest = useRef<string | null>(null);
  useEffect(() => {
    latest.current = [...messages].reverse().find((m) => !m._id.startsWith("pending-"))?.createdAt ?? null;
  }, [messages]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (keepFrom.current !== null) {
      // Older messages went in above: stay where you were reading.
      el.scrollTop = el.scrollHeight - keepFrom.current;
      keepFrom.current = null;
    } else if (pinned.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const after = latest.current;
      const res = await fetch(`/api/messages/${person.handle}${after ? `?after=${encodeURIComponent(after)}` : ""}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok || !live) return;
      const data = (await res.json()) as ThreadOpenT;
      if (!live) return;
      if (data.messages.length) setMessages((ms) => merge(ms, data.messages));
      setClosed(data.closed);
      setBlocked(data.blocked);
    };
    const timer = window.setInterval(tick, POLL);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [person.handle]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const words = text.trim();
    if (!words || sending || closed) return;
    const pending: DirectMessageT = { _id: `pending-${Date.now()}`, text: words, mine: true, createdAt: new Date().toISOString() };
    pinned.current = true;
    setMessages((ms) => [...ms, pending]);
    setText("");
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${person.handle}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: words }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: DirectMessageT; error?: string };
      if (!res.ok || !data.message) throw new Error(data.error ?? "That didn’t send. Try again.");
      setMessages((ms) => merge(ms.filter((m) => m._id !== pending._id), [data.message!]));
      // The list beside it (on a desktop) shows the conversation at once, even a new one.
      window.dispatchEvent(new Event(CHANGED_EVENT));
    } catch (err) {
      setMessages((ms) => ms.filter((m) => m._id !== pending._id));
      setText(words);
      toast(err instanceof Error ? err.message : "That didn’t send. Try again.", "danger");
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends on a keyboard; on a phone it makes a new line and the button sends.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      void send();
    }
  }

  async function older() {
    if (loadingOlder || !messages.length) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/messages/${person.handle}?before=${encodeURIComponent(messages[0].createdAt)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ThreadOpenT;
      keepFrom.current = (scroller.current?.scrollHeight ?? 0) - (scroller.current?.scrollTop ?? 0);
      setMessages((ms) => merge(data.messages, ms));
      setMore(data.more);
    } catch {
      toast("Earlier messages didn’t load. Try again.", "danger");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function block(next: boolean) {
    if (next && !arming) {
      setArming(true);
      return;
    }
    setArming(false);
    try {
      const res = await fetch(`/api/messages/${person.handle}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: next }),
      });
      if (!res.ok) throw new Error();
      setBlocked(next);
      setClosed(next ? `You blocked ${first}. Unblock them to write.` : null);
      window.dispatchEvent(new Event(CHANGED_EVENT));
      toast(next ? `${first} can’t message you now.` : `${first} can message you again.`);
    } catch {
      toast("That didn’t change. Try again.", "danger");
    }
  }

  return (
    <section
      aria-labelledby={`${id}-who`}
      className="card flex min-h-[22rem] flex-col p-3 max-lg:h-[calc(100svh-10.75rem-env(safe-area-inset-bottom))] sm:p-4 lg:h-[min(46rem,calc(100svh-13rem))]"
    >
      <header className="flex shrink-0 items-center gap-3 px-1 pb-3">
        <Link href="/messages" aria-label="All messages" className="-ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink lg:hidden">
          <Icon name="arrow-left" className="h-5 w-5" />
        </Link>
        <Link href={`/u/${person.handle}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md">
          <Avatar name={person.name} hue={person.hue} size={44} />
          <span className="min-w-0">
            <span id={`${id}-who`} className="block truncate font-semibold leading-tight">
              {person.name}
            </span>
            <span className="block truncate text-[0.8125rem] text-ink/65">@{person.handle}</span>
          </span>
        </Link>
        <button
          type="button"
          className={`chip chip-sm shrink-0 ${arming ? "!text-bad" : ""}`}
          onClick={() => block(!blocked)}
          onBlur={() => setArming(false)}
          aria-label={blocked ? `Unblock ${person.name}` : arming ? `Press again to block ${person.name}` : `Block ${person.name}`}
        >
          {blocked ? "Unblock" : arming ? "Press again to block" : "Block"}
        </button>
      </header>

      <div
        ref={scroller}
        tabIndex={0}
        aria-label={`Messages with ${person.name}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="rule -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain border-y-2 px-2 py-4 [scrollbar-width:thin]"
      >
        {more ? (
          <div className="mb-4 flex justify-center">
            <button type="button" className="chip chip-sm" onClick={older} disabled={loadingOlder}>
              {loadingOlder ? "Loading…" : "Earlier messages"}
            </button>
          </div>
        ) : null}
        {messages.length ? (
          <ol className="grid grid-cols-1 gap-1.5" aria-live="polite" aria-relevant="additions">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = !prev || dayKey(prev.createdAt, tz) !== dayKey(m.createdAt, tz);
              // The time goes under the last of a run from one person.
              const lastOfRun = !next || next.mine !== m.mine || Date.parse(next.createdAt) - Date.parse(m.createdAt) > 10 * 60_000;
              return (
                <li key={m._id} className="appear grid grid-cols-1">
                  {newDay ? (
                    <p className="my-3 text-center text-[0.8125rem] font-semibold text-ink/65" suppressHydrationWarning>
                      {dayLabel(m.createdAt, tz)}
                    </p>
                  ) : null}
                  <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                    <p
                      data-hue={m.mine ? undefined : person.hue}
                      className={`max-w-[min(34rem,82%)] whitespace-pre-line px-4 py-2.5 leading-snug [overflow-wrap:anywhere] ${
                        m.mine ? "bubble-you" : "rounded-[22px] rounded-tl-[6px] border-2 border-edge bg-tint text-deep"
                      } ${m._id.startsWith("pending-") ? "opacity-70" : ""}`}
                    >
                      {m.text}
                    </p>
                  </div>
                  {lastOfRun ? (
                    <p className={`mt-1 px-1 text-[0.75rem] text-ink/65 ${m.mine ? "text-right" : ""}`}>
                      {m._id.startsWith("pending-") ? "Sending…" : clock(m.createdAt, tz)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="grid h-full place-items-center px-4 text-center">
            <div>
              <Avatar name={person.name} hue={person.hue} size={64} className="mx-auto" />
              <p className="mt-3 font-semibold">Say hello to {first}</p>
              <p className="mt-1 text-[0.9375rem] text-ink/70">Only the two of you see this conversation.</p>
            </div>
          </div>
        )}
      </div>

      {closed ? (
        <div className="well mt-3 flex shrink-0 flex-wrap items-center gap-3 px-4 py-3">
          <Icon name="lock" className="h-4 w-4 shrink-0 text-ink/65" />
          <p className="min-w-0 flex-1 basis-48 text-[0.9375rem]">{closed}</p>
          {blocked ? (
            <Button size="sm" variant="secondary" onClick={() => block(false)}>
              Unblock
            </Button>
          ) : /handle/i.test(closed) ? (
            <Link href="/settings#profile" className="link inline-flex min-h-11 items-center font-semibold">
              Choose a handle
            </Link>
          ) : null}
        </div>
      ) : (
        <form onSubmit={send} className="mt-3 flex shrink-0 items-end gap-2">
          <label htmlFor={`${id}-input`} className="sr-only">
            Message {person.name}
          </label>
          <textarea
            ref={input}
            id={`${id}-input`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX}
            rows={1}
            placeholder={`Message ${first}`}
            className="control max-h-40 !min-h-12 resize-none !rounded-[1.5rem] !py-3 leading-snug [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send"
            className="press grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-edge bg-sun text-on-sun transition-[transform,box-shadow,opacity] duration-300 disabled:opacity-45"
          >
            <Icon name="send" className="h-5 w-5" />
          </button>
        </form>
      )}
    </section>
  );
}
