"use client";

import { useEffect, useRef, useState } from "react";
import { Conversation } from "@/components/home/Conversation";
import type { KataMessage } from "@/lib/types";
import { MaruMark } from "./Avatar";
import { ASK_EVENT, HELLO_EVENT, helloDue, useCompanion, type Focus } from "./Companion";
import { Icon } from "./Icon";
import { watchPosts } from "./screen";
import { useToast } from "./Toast";

interface Loaded {
  messages: KataMessage[];
  week: (number | null)[];
  today: string;
  ai: boolean;
}

// Pages with their own fixed save bar at the bottom: the button sits above it.
const RAISED = ["/entry/new", "/settings/template"];

/**
 * Maru on every page: a round button (or ⌘K / Ctrl+K) opens today's conversation in a panel,
 * where Maru can change anything for you and knows which page you're on. "Ask Maru" on a
 * post opens it about that post. Home has the conversation on the page itself, so there the
 * shortcut and the posts' buttons go to it instead.
 */
export function AskMaru({ pathname, focused = false }: { pathname: string; focused?: boolean }) {
  const { toast } = useToast();
  const { name } = useCompanion();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [hello, setHello] = useState<KataMessage | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const onHome = pathname === "/dashboard";
  // Writing, or in the middle of a conversation with someone: Maru can wait.
  const busy = pathname.startsWith("/entry/new") || pathname === "/settings/template" || pathname.startsWith("/messages/");

  function close() {
    setOpen(false);
    setFocus(null);
    opener.current?.focus();
  }

  // Which post they're on, for "this one".
  useEffect(() => watchPosts(), []);

  // Coming back: Maru says hi and asks something. Home shows it in the conversation; anywhere
  // else it's a bubble by the button, and the conversation has it when opened.
  useEffect(() => {
    if (focused || busy) return;
    let live = true;
    const greet = async () => {
      if (document.visibilityState !== "visible" || !helloDue()) return;
      const res = await fetch("/api/companion/hello", { method: "POST" }).catch(() => null);
      const data = (await res?.json().catch(() => null)) as { message?: KataMessage | null } | null;
      if (!live || !data?.message) return;
      if (document.getElementById("tell-maru")) window.dispatchEvent(new CustomEvent<KataMessage>(HELLO_EVENT, { detail: data.message }));
      else setHello(data.message);
    };
    void greet();
    document.addEventListener("visibilitychange", greet);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", greet);
    };
  }, [focused, busy]);

  // A post's "Ask Maru": open about it. An open panel's conversation takes it up itself.
  useEffect(() => {
    if (onHome) return;
    const onAsk = (e: Event) => {
      setFocus((e as CustomEvent<Focus>).detail);
      setOpen(true);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, [onHome]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (onHome) document.getElementById("tell-maru")?.focus();
        else if (open) close();
        else setOpen(true);
      } else if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHome, open]);

  // Fresh each time it opens: the conversation may have moved on elsewhere (on home, say).
  useEffect(() => {
    if (!open) return;
    let live = true;
    fetch("/api/companion", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d: { messages: KataMessage[]; mood: { week: (number | null)[] }; ai?: boolean; today?: string }) => {
        if (!live) return;
        setLoaded({ messages: d.messages, week: d.mood.week, today: d.today ?? new Date().toISOString().slice(0, 10), ai: d.ai ?? true });
        requestAnimationFrame(() => document.getElementById("tell-maru-dock")?.focus());
      })
      .catch(() => {
        if (!live) return;
        toast(`${name} couldn’t open just now. Try again.`, "danger");
        setOpen(false);
      });
    return () => {
      live = false;
    };
  }, [open, toast, name]);

  if (onHome) return null;
  const raised = !focused && RAISED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // A conversation's send and follow buttons sit where Maru's would, at every width: ⌘K still opens it.
  const chatting = pathname.startsWith("/messages/");

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label={name}
          className="fixed inset-x-2 bottom-2 z-50 h-[min(85svh,44rem)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(27rem,calc(100vw-2.5rem))] sm:h-[min(42rem,calc(100svh-2.5rem))]"
        >
          {loaded ? (
            <Conversation
              key={loaded.messages.length}
              initial={loaded.messages}
              checkInLine=""
              moodWeek={loaded.week}
              today={loaded.today}
              ai={loaded.ai}
              where={pathname}
              initialFocus={focus}
              dock={{
                onClose: close,
                // On a phone the panel covers the page, so it steps aside to show the one Maru opened.
                onNavigate: () => {
                  if (matchMedia("(max-width: 639px)").matches) setOpen(false);
                },
              }}
            />
          ) : (
            <div className="card grid h-full place-items-center p-6" role="status">
              <span className="typing text-ink/70" aria-label={`Opening ${name}`}>
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
        </div>
      ) : null}

      {hello && !open && !busy ? (
        <div className={`appear fixed right-4 z-40 flex max-w-[min(20rem,calc(100vw-2rem))] items-start gap-1 lg:right-6 ${focused ? "bottom-24" : "bottom-[calc(10.5rem+env(safe-area-inset-bottom))] lg:bottom-24"}`}>
          <button
            type="button"
            onClick={() => {
              setHello(null);
              setOpen(true);
            }}
            className="bubble-kata min-w-0 px-4 py-3 text-left leading-snug"
          >
            {hello.text}
          </button>
          <button type="button" onClick={() => setHello(null)} aria-label="Dismiss" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ask ${name}`}
        aria-keyshortcuts="Meta+K Control+K"
        title={`Ask ${name} (⌘K)`}
        className={`press fixed right-4 z-40 flex items-center gap-2.5 rounded-full border-2 border-edge bg-surface p-1.5 transition-[transform,box-shadow,opacity] duration-300 lg:right-6 lg:pr-4 ${
          focused ? "bottom-5 lg:bottom-6" : raised ? "bottom-[calc(6.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-6"
        } ${open ? "pointer-events-none opacity-0" : ""} ${chatting ? "hidden" : ""}`}
      >
        <MaruMark size={44} />
        <span className="hidden max-w-[9rem] truncate font-semibold lg:inline">Ask {name}</span>
        <kbd className="hidden rounded-md border-2 border-edge/30 px-1.5 text-[0.75rem] font-semibold text-ink/65 lg:inline">⌘K</kbd>
      </button>
    </>
  );
}
