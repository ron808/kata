"use client";

import { useState } from "react";
import { ASKS_EVENT } from "@/components/shared/Companion";
import { useToast } from "@/components/shared/Toast";

/*
 * What the writer asked to be asked about later, soonest first, each with Drop. They come up as
 * Maru's message when the writer's next in Kata after the time; nothing is sent anywhere else.
 */

export interface WaitingAsk {
  _id: string;
  text: string;
  at: string;
}

/** "Today, 6 pm", "Fri, 9 am", "Nov 20, 9 am", in their own zone. */
function whenText(at: string, tz: string): string {
  const d = new Date(at);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const on =
    day(d) === day(today)
      ? "Today"
      : day(d) === day(tomorrow)
        ? "Tomorrow"
        : d.getTime() - today.getTime() < 6 * 86_400_000
          ? d.toLocaleDateString("en-US", { weekday: "short", timeZone: tz })
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });
  const clock = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).replace(":00", "").toLowerCase();
  return `${on}, ${clock}`;
}

export function WaitingAsks({ initial, name, tz }: { initial: WaitingAsk[]; name: string; tz: string }) {
  const { toast } = useToast();
  const [asks, setAsks] = useState(initial);
  const [dropping, setDropping] = useState<string | null>(null);

  async function drop(a: WaitingAsk) {
    setDropping(a._id);
    const res = await fetch(`/api/companion/asks?id=${encodeURIComponent(a._id)}`, { method: "DELETE" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { next?: string | null; error?: string } | null;
    setDropping(null);
    if (!res?.ok) {
      toast(data?.error ?? "That didn’t go through. Try again.", "danger");
      return;
    }
    setAsks((xs) => xs.filter((x) => x._id !== a._id));
    window.dispatchEvent(new CustomEvent<string | null>(ASKS_EVENT, { detail: data?.next ?? null }));
    toast(`Dropped: ${a.text}`, "success");
  }

  if (!asks.length) {
    return (
      <p className="text-[0.9375rem] text-ink/75">
        Nothing waiting. Tell {name} “ask me about calling Mum tonight” and it comes up when you’re here after then.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1">
      {asks.map((a) => (
        <li key={a._id} className="rule flex min-h-14 items-center gap-3 border-t-2 py-2 first:border-t-0">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold [overflow-wrap:anywhere]">{a.text.charAt(0).toUpperCase() + a.text.slice(1)}</span>
            <span className="block text-[0.875rem] text-ink/70">{whenText(a.at, tz)}</span>
          </span>
          <button type="button" className="chip chip-sm shrink-0" onClick={() => drop(a)} disabled={dropping === a._id} aria-label={`Drop ${a.text}`}>
            Drop
          </button>
        </li>
      ))}
    </ul>
  );
}
