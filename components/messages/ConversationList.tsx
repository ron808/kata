"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Ago } from "@/components/people/time";
import type { ConversationT } from "@/lib/types";
import { CHANGED_EVENT } from "./Chat";

/** Everyone you're writing with, the latest first; it checks for new messages while it's on screen. */
export function ConversationList({ initial, active = null }: { initial: ConversationT[]; active?: string | null }) {
  const [list, setList] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setList(initial);
  }

  useEffect(() => {
    let live = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/messages", { cache: "no-store" }).catch(() => null);
      if (!res?.ok || !live) return;
      const data = (await res.json()) as { conversations: ConversationT[] };
      if (live) setList(data.conversations);
    };
    const id = window.setInterval(tick, 15_000);
    window.addEventListener(CHANGED_EVENT, tick);
    return () => {
      live = false;
      window.clearInterval(id);
      window.removeEventListener(CHANGED_EVENT, tick);
    };
  }, []);

  if (!list.length) {
    return (
      <div className="card p-6">
        <p className="font-display text-display-s">No messages yet</p>
        <p className="mt-2 text-ink/75">
          Once you and someone follow each other, you can write from their profile. Follow a friend, and when they follow back, say hello.
        </p>
        <Link href="/people" className="link mt-4 inline-flex min-h-11 items-center font-semibold">
          Find people
        </Link>
      </div>
    );
  }

  return (
    <nav aria-label="Conversations" className="card p-2 sm:p-3">
      <ul>
        {list.map((c) => {
          const here = active === c.person.handle;
          return (
            <li key={c.person.handle} className="rule border-t-2 first:border-t-0">
              <Link
                href={`/messages/${c.person.handle}`}
                aria-current={here ? "page" : undefined}
                className={`flex min-h-16 items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${here ? "bg-sun text-on-sun" : "hover:bg-ink/[0.04]"}`}
              >
                <Avatar name={c.person.name} hue={c.person.hue} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.person.name}</span>
                    <Ago iso={c.lastAt} className={`shrink-0 text-[0.8125rem] ${here ? "opacity-80" : "text-ink/65"}`} />
                  </span>
                  <span className={`mt-0.5 block truncate text-[0.875rem] ${here ? "opacity-85" : c.unread ? "font-semibold text-ink" : "text-ink/70"}`}>
                    {c.blocked ? "Blocked" : c.lastText ? `${c.lastFromMe ? "You: " : ""}${c.lastText}` : "No messages yet"}
                  </span>
                </span>
                {c.unread ? (
                  <span
                    aria-label={`${c.unread} new`}
                    className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full border-2 border-edge bg-accent px-1.5 text-[0.75rem] font-bold leading-none text-on-accent tabular-nums"
                  >
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
