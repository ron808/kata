"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { KIND_LABEL, STATUS_LABEL, Status } from "@/components/shared/Status";
import { useToast } from "@/components/shared/Toast";
import { metaWithToday, onYourMind, showsStatus, stepOn, stepsFor, touchedPhrase } from "@/components/home/meta";
import { patchThread } from "@/components/home/MindCard";
import { ThreadMap } from "@/components/home/ThreadMap";
import type { ThreadKind, ThreadT } from "@/lib/types";
import { ThreadFields } from "./ThreadFields";

const KINDS = Object.keys(KIND_LABEL) as ThreadKind[];

const RECENT_MS = 14 * 86_400_000;
const lately = (t: ThreadT, today: string) => Date.parse(today) - Date.parse(t.lastTouchedAt) <= RECENT_MS;

const GROUPS: { title: string; test: (t: ThreadT, today: string) => boolean }[] = [
  { title: "On your mind", test: (t) => !t.archived && t.status !== "done" && t.status !== "paused" },
  { title: "Done lately", test: (t, today) => !t.archived && t.status === "done" && lately(t, today) },
  { title: "Paused", test: (t) => !t.archived && t.status === "paused" },
  { title: "Done earlier", test: (t, today) => !t.archived && t.status === "done" && !lately(t, today) },
  { title: "Archived", test: (t) => t.archived },
];

/**
 * Everything Kata keeps track of: the map of what's on your mind, every thread by state,
 * and an editor for the one you open. `?t=<id>` opens a thread (home links here).
 */
export function ThreadsBoard({
  initial,
  today,
  tz,
  aside,
}: {
  initial: ThreadT[];
  today: string;
  tz: string;
  /** More of Kata's model of you, under the map (what it remembers). */
  aside?: ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const { name: companionName } = useCompanion();
  const [threads, setThreads] = useState(initial);
  const [open, setOpen] = useState<string | null>(() => params.get("t"));
  // The page reloads its data when the companion changes a thread, and its receipts link
  // here with ?t= to open the one it touched.
  const [seen, setSeen] = useState({ initial, t: params.get("t") });
  if (initial !== seen.initial || params.get("t") !== seen.t) {
    setSeen({ initial, t: params.get("t") });
    if (initial !== seen.initial) setThreads(initial);
    if (params.get("t") !== seen.t) setOpen(params.get("t"));
  }
  useEffect(() => {
    if (!seen.t) return;
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    requestAnimationFrame(() => document.getElementById(`thread-${seen.t}`)?.scrollIntoView({ block: "nearest", behavior }));
  }, [seen.t]);
  const [title, setTitle] = useState("");
  // No kind picked: Kata guesses from the name.
  const [kind, setKind] = useState<ThreadKind | null>(null);
  const [adding, setAdding] = useState(false);

  function select(id: string | null) {
    setOpen(id);
    router.replace(id ? `/threads?t=${id}` : "/threads", { scroll: false });
    if (id) requestAnimationFrame(() => document.getElementById(`thread-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  const update = (t: ThreadT) => setThreads((ts) => ts.map((x) => (x._id === t._id ? t : x)));
  const remove = (id: string) => {
    setThreads((ts) => ts.filter((x) => x._id !== id));
    select(null);
  };

  async function add(e: FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind ? { title: name, kind } : { title: name }),
      });
      const data = (await res.json().catch(() => ({}))) as { thread?: ThreadT; error?: string };
      if (!res.ok || !data.thread) throw new Error(data.error ?? "That didn’t save. Try again.");
      const t = data.thread;
      setThreads((ts) => [t, ...ts.filter((x) => x._id !== t._id)]);
      setTitle("");
      setKind(null);
      select(t._id);
      toast(t.kind === "event" && !t.dueAt ? `Add a date and ${companionName} will ask about it.` : `${companionName} will ask about ${t.title}.`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "That didn’t save", "danger");
    } finally {
      setAdding(false);
    }
  }

  const mind = onYourMind(threads);

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6 lg:col-span-5">
        <section aria-label="Map" className="card p-4 sm:p-6">
          <h2 className="font-display text-display-s">On your mind</h2>
          <p className="mt-1.5 text-[0.875rem] text-ink/65">The six things {companionName} asks about first.</p>
          <div className="-mx-1 mt-4 sm:mx-0">
            <ThreadMap threads={mind} selected={open} onSelect={select} today={today} tz={tz} />
          </div>
        </section>

        <form onSubmit={add} className="card p-4 sm:p-6" aria-labelledby="add-heading">
          <h2 id="add-heading" className="font-display text-display-s">
            Add a thread
          </h2>
          <p className="mt-1.5 text-[0.875rem] text-ink/65">Something you’re working on, a goal, a habit, someone, a date.</p>
          <label htmlFor="new-thread" className="sr-only">
            What is it?
          </label>
          <input
            id="new-thread"
            className="control mt-4"
            placeholder="Portfolio site, half marathon, call Grandma…"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Kind (optional)">
            {KINDS.filter((k) => k !== "other").map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)} className="chip chip-sm">
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.8125rem] text-ink/65">Leave the kind and {companionName} will guess it.</p>
          <Button type="submit" className="mt-5" disabled={adding || !title.trim()}>
            <Icon name="plus" className="h-4 w-4" />
            {adding ? "Adding…" : "Add thread"}
          </Button>
        </form>
        {aside}
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start gap-6 lg:col-span-7">
        {threads.length === 0 ? (
          <div className="card p-6 text-ink/75">
            <p className="font-display text-display-s text-ink">No threads yet.</p>
            <p className="mt-3">
              Tell {companionName} what’s on your plate on the home page, write a page, or add one here. {companionName} will
              check in on each one and ask the right questions.
            </p>
          </div>
        ) : null}
        {GROUPS.map((g) => {
          const items = threads.filter((t) => g.test(t, today));
          if (!items.length) return null;
          return (
            <section key={g.title} aria-label={g.title} className="card p-2 sm:p-3">
              <h2 className="px-3 pb-1 pt-3 font-display text-display-s">
                {g.title} <span className="text-ink/45 tabular-nums">{items.length}</span>
              </h2>
              <ul>
                {items.map((t) => (
                  <li key={t._id} id={`thread-${t._id}`} className="rule border-t-2 first:border-t-0">
                    <button
                      type="button"
                      onClick={() => select(open === t._id ? null : t._id)}
                      aria-expanded={open === t._id}
                      aria-controls={`edit-${t._id}`}
                      className="flex min-h-16 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-ink/[0.04]"
                    >
                      <span data-hue={t.hue % 8} className="h-9 w-9 shrink-0 rounded-full border-2 border-edge bg-hue" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{t.title}</span>
                        <span className="block truncate text-[0.8125rem] text-ink/65">
                          {KIND_LABEL[t.kind]} · {metaWithToday(t, today, tz)}
                          {t.shared ? " · on your profile" : ""}
                        </span>
                      </span>
                      {showsStatus(t) ? <Status status={t.status} /> : null}
                      <Icon name="arrow-down" className={`h-4 w-4 shrink-0 text-ink/55 transition-transform ${open === t._id ? "rotate-180" : ""}`} />
                    </button>
                    {open === t._id ? (
                      <div id={`edit-${t._id}`} className="px-1 pb-3 sm:px-3">
                        <ThreadEditor thread={t} today={today} tz={tz} onSaved={update} onClose={() => select(null)} onRemoved={() => remove(t._id)} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ThreadEditor({
  thread: t,
  today,
  tz,
  onSaved,
  onClose,
  onRemoved,
}: {
  thread: ThreadT;
  today: string;
  tz: string;
  onSaved: (t: ThreadT) => void;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const { toast } = useToast();
  const { name: companionName } = useCompanion();
  const [title, setTitle] = useState(t.title);
  const [next, setNext] = useState(t.nextStep);
  const [due, setDue] = useState(t.dueAt ? t.dueAt.slice(0, 10) : "");
  const [tags, setTags] = useState(t.tags.join(", "));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fields = {
    title: title.trim() !== t.title ? title.trim() : undefined,
    nextStep: next.trim() !== t.nextStep ? next.trim() : undefined,
    dueAt: due !== (t.dueAt ? t.dueAt.slice(0, 10) : "") ? due || null : undefined,
    tags:
      tags !== t.tags.join(", ")
        ? tags
            .split(",")
            .map((x) => x.trim().replace(/^#/, ""))
            .filter(Boolean)
        : undefined,
  };
  const dirty = Object.values(fields).some((v) => v !== undefined);

  async function save(body: Record<string, unknown>, done?: string) {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await patchThread(t._id, body);
      onSaved(saved);
      if (done) toast(done, "success");
      return saved;
    } catch (err) {
      toast(err instanceof Error ? err.message : "That didn’t save", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function saveFields(e: FormEvent) {
    e.preventDefault();
    if (!dirty || !title.trim()) return;
    const body = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await save(body, "Saved");
  }

  async function addNote() {
    const text = note.trim();
    if (!text) return;
    if (await save({ note: text })) setNote("");
  }

  async function destroy() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/threads/${t._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("That didn’t delete. Try again.");
      toast(`${t.title} deleted`);
      onRemoved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "That didn’t delete", "danger");
      setBusy(false);
    }
  }

  const log = [...t.log].reverse().slice(0, 12);
  const from: Record<ThreadT["log"][number]["from"], string> = { you: "You", kata: companionName, page: "From a page" };

  return (
    <div className="well appear space-y-5 p-4 sm:p-5" data-hue={t.hue % 8}>
      <div>
        <p className="mb-2 text-[0.875rem] font-semibold">Where it is</p>
        <div className="scale" role="group" aria-label={`Where ${t.title} is`}>
          {stepsFor(t.kind).map((s) => (
            <button
              key={s.value}
              type="button"
              className="scale-step scale-row"
              aria-pressed={stepOn(t, s.value, today, tz)}
              disabled={busy}
              onClick={() => !stepOn(t, s.value, today, tz) && save({ status: s.value }, t.kind === "habit" && s.value === "done" ? `${t.title}: done for today.` : undefined)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ThreadFields thread={t} today={today} busy={busy} save={save} />

      <form onSubmit={saveFields} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-[0.875rem] font-semibold">Name</span>
          <input className="control" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-[0.875rem] font-semibold">Next step</span>
          <input className="control" value={next} maxLength={140} placeholder="The very next thing" onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-[0.875rem] font-semibold">Due</span>
          <input className="control" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-[0.875rem] font-semibold">Tags</span>
          <input className="control" value={tags} placeholder="work, launch" onChange={(e) => setTags(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={busy || !dirty || !title.trim()}>
            Save changes
          </Button>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kind">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={t.kind === k}
                disabled={busy}
                onClick={() => t.kind !== k && save({ kind: k })}
                className="chip chip-sm"
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div>
        <label htmlFor={`note-${t._id}`} className="mb-2 block text-[0.875rem] font-semibold">
          Add a note
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`note-${t._id}`}
            className="control"
            value={note}
            maxLength={280}
            placeholder="Where it stands, in your words"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNote();
              }
            }}
          />
          <Button variant="secondary" onClick={addNote} disabled={busy || !note.trim()} className="shrink-0">
            Add note
          </Button>
        </div>
      </div>

      {log.length ? (
        <div>
          <p className="mb-2 text-[0.875rem] font-semibold">What {companionName} knows</p>
          <ol className="space-y-2">
            {log.map((l, i) => (
              <li key={`${l.at}-${i}`} className="flex gap-3 text-[0.9375rem]">
                <span className="mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-hue ring-2 ring-edge" aria-hidden />
                <span className="min-w-0">
                  <span className="text-ink/65">
                    {from[l.from]} · {touchedPhrase(l.at, today, tz)}
                    {l.status ? ` · ${STATUS_LABEL[l.status]}` : ""}
                  </span>
                  {l.text ? <span className="block">{l.text}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="rule flex flex-wrap items-center gap-2 border-t-2 pt-4">
        <button
          type="button"
          className="chip chip-sm"
          aria-pressed={t.shared}
          disabled={busy}
          onClick={() => save({ shared: !t.shared }, t.shared ? "Hidden from your profile" : "Shown on your profile")}
        >
          <Icon name={t.shared ? "check" : "eye"} className="h-4 w-4" />
          {t.shared ? "On your profile" : "Show on my profile"}
        </button>
        {t.archived ? (
          <button type="button" className="chip chip-sm" disabled={busy} onClick={() => save({ archived: false }, `${t.title} is back`)}>
            Bring back
          </button>
        ) : (
          <button type="button" className="chip chip-sm" disabled={busy} onClick={() => save({ archived: true }, `Archived. It comes back if you mention ${t.title} again.`).then((s) => s && onClose())}>
            Archive
          </button>
        )}
        <button type="button" className="chip chip-sm ml-auto !text-bad" disabled={busy} onClick={destroy} onBlur={() => setConfirming(false)}>
          <Icon name="trash" className="h-4 w-4" />
          {confirming ? "Press again to delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}
