"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { nanoid } from "nanoid";
import { MaruMark } from "@/components/shared/Avatar";
import { useCompanion } from "@/components/shared/Companion";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";
import { sameQuestion } from "./fieldTypes";
import { QuestionChip } from "./QuestionChip";

type Status = "idle" | "asking" | "done" | "error";

/** The companion suggests questions from a short description; you pick which go on the page. */
export function AskKata({
  id,
  existing,
  room,
  onAdd,
  onClose,
}: {
  id: string;
  existing: TemplateField[];
  /** How many more fields the page can hold. */
  room: number;
  onAdd: (fields: TemplateField[]) => void;
  onClose: () => void;
}) {
  const { name } = useCompanion();
  const inputId = useId();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [offered, setOffered] = useState<TemplateField[]>([]);
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [note, setNote] = useState<string | null>(null);
  const seq = useRef(0);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const description = text.trim();
    if (!description || status === "asking") return;
    const n = ++seq.current;
    setStatus("asking");
    setNote(null);
    try {
      const res = await fetch("/api/templates/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = (await res.json().catch(() => ({}))) as { fields?: TemplateField[]; error?: string };
      if (n !== seq.current) return;
      if (!res.ok) throw new Error(res.status === 429 ? "I’ve had a lot of asks this minute. Try again shortly." : "I couldn’t come up with questions just now. Try again.");
      const fresh = (data.fields ?? []).filter(
        (f) => f.type !== "divider" && f.label?.trim() && !existing.some((x) => sameQuestion(x.label, f.label))
      );
      setOffered(fresh);
      setPicked(new Set());
      setStatus("done");
    } catch (err) {
      if (n !== seq.current) return;
      setOffered([]);
      setStatus("error");
      setNote(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  function toggle(fieldId: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }

  function add() {
    const chosen = offered.filter((f) => picked.has(f.id)).slice(0, room);
    if (!chosen.length) return;
    onAdd(chosen.map((f) => ({ ...f, id: nanoid(8), config: { ...(f.config ?? {}) } })));
    setOffered((prev) => prev.filter((f) => !chosen.some((c) => c.id === f.id)));
    setPicked(new Set());
    setNote(`Added ${chosen.length} to the bottom of your page.`);
  }

  const count = picked.size;
  const over = count > room;

  return (
    <section id={id} aria-label={`Ask ${name} for questions`} className="card appear p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <MaruMark size={36} />
        <p className="bubble-kata min-w-0 flex-1 px-4 py-3 sm:flex-none sm:max-w-[40ch]">
          What should this page help you keep track of? A sentence is plenty.
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close Ask ${name}`}
          className="-mr-1 -mt-1 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/65 transition-colors hover:bg-ink/[0.06] hover:text-ink"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={ask} className="mt-4 flex flex-col gap-2.5 xs:flex-row">
        <label htmlFor={inputId} className="sr-only">
          What this page is for
        </label>
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Sleeping better and a side project"
          autoComplete="off"
          className="control min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" disabled={!text.trim() || status === "asking"} className="h-[3.25rem] shrink-0">
          {status === "asking" ? "Thinking…" : "Suggest"}
        </Button>
      </form>

      <div aria-live="polite">
        {status === "asking" ? (
          <p className="mt-4 inline-flex items-center gap-2.5 text-sm text-ink/70">
            <span className="typing" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {name} is thinking of questions
          </p>
        ) : null}

        {status === "done" && offered.length ? (
          <fieldset className="appear mt-5">
            <legend className="text-[0.9375rem] font-semibold">
              Pick the ones you want <span className="font-normal text-ink/65">· {count} picked</span>
            </legend>
            <ul className="mt-3 flex flex-wrap gap-2.5">
              {offered.map((f, i) => (
                <li key={f.id} className="max-w-full">
                  <QuestionChip field={f} checked={picked.has(f.id)} onToggle={() => toggle(f.id)} index={i} mode="pick" />
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button variant="secondary" onClick={add} disabled={!count || room === 0}>
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
                {count ? `Add ${Math.min(count, room)} ${Math.min(count, room) === 1 ? "question" : "questions"}` : "Add questions"}
              </Button>
              {over ? (
                <p className="text-sm text-ink/70">
                  Your page has room for {room} more.
                </p>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        {status === "done" && !offered.length && !note ? (
          <p className="appear mt-4 text-[0.9375rem] text-ink/75">
            Everything I’d ask is on your page already. Try describing something else.
          </p>
        ) : null}

        {note ? (
          <p className={`appear mt-4 text-[0.9375rem] font-medium ${status === "error" ? "text-bad" : "text-ink/75"}`}>{note}</p>
        ) : null}
      </div>
    </section>
  );
}
