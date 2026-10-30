"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";

export interface MemoryT {
  _id: string;
  text: string;
  at: string;
}

/** What Kata remembers about you: read it, add to it, delete any of it. Newest first. */
export function Memories({ initial }: { initial: MemoryT[] }) {
  const { toast } = useToast();
  const { name } = useCompanion();
  const [items, setItems] = useState(initial);
  // The page reloads its data when the companion remembers or forgets something.
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setItems(initial);
  }
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(init: RequestInit & { url: string }, done?: string) {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await fetch(init.url, init);
      const data = (await res.json().catch(() => ({}))) as { memories?: MemoryT[]; error?: string };
      if (!res.ok || !data.memories) throw new Error(data.error ?? "That didn’t save. Try again.");
      setItems(data.memories);
      if (done) toast(done, "success");
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : "That didn’t save", "danger");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const fact = text.trim();
    if (!fact) return;
    const ok = await call(
      { url: "/api/companion/memory", method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: fact }) },
      `${name} will remember that.`
    );
    if (ok) setText("");
  }

  return (
    <section id="memories" aria-labelledby="memories-heading" className="card scroll-mt-24 p-4 sm:p-6">
      <h2 id="memories-heading" className="font-display text-display-s">
        What {name} remembers
      </h2>
      <p className="mt-1.5 text-[0.875rem] text-ink/65">
        Facts {name} keeps so it never asks twice. Only you see them, and you can delete any.
      </p>
      {items.length ? (
        <ul className="mt-4">
          {items.map((m) => (
            <li key={m._id} className="rule flex items-start gap-3 border-t-2 py-2.5 first:border-t-0">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
              <p className="min-w-0 flex-1 leading-snug">{m.text}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => call({ url: `/api/companion/memory?id=${m._id}`, method: "DELETE" }, "Forgotten.")}
                aria-label={`Forget: ${m.text}`}
                className="-mr-2 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-50"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="well mt-4 p-4 text-[0.9375rem] text-ink/75">
          Nothing yet. Tell {name} about the people and routines in your life, or add something here.
        </p>
      )}
      <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="memory-new" className="sr-only">
          Something {name} should know
        </label>
        <input
          id="memory-new"
          className="control"
          value={text}
          maxLength={200}
          placeholder="My sister Ana lives in Porto"
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="shrink-0" disabled={busy || !text.trim()}>
          Remember
        </Button>
      </form>
    </section>
  );
}
