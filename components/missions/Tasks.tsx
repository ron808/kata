"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { lasted, spentOn } from "@/lib/missions/core";
import type { MissionChange } from "@/lib/missions/schemas";
import type { TaskT } from "@/lib/types";

type Act = (change: MissionChange) => unknown;

const isDone = (t: TaskT) => t.status === "done";
const ended = (t: TaskT) => t.status === "done" || t.status === "skipped";

/** When it's planned, how long it's meant to take, how long it took. */
function facts(t: TaskT, now: number): string {
  const spent = spentOn(t, now);
  return [t.atText, t.minutes ? `${t.minutes} min` : "", spent >= 60_000 && ended(t) ? `took ${lasted(spent)}` : ""].filter(Boolean).join(" · ");
}

/** The tick that finishes a task, or brings it back. */
function Tick({ task, act, busy, readOnly }: { task: TaskT; act: Act; busy: boolean; readOnly: boolean }) {
  const done = isDone(task);
  if (readOnly) {
    return (
      <span data-hue={task.hue} className="grid h-11 w-11 shrink-0 place-items-center">
        <span className={`grid h-7 w-7 place-items-center rounded-full border-2 border-edge ${done ? "bg-hue text-on-hue" : ""}`}>
          {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : null}
          <span className="sr-only">{done ? "Done" : task.status === "skipped" ? "Skipped" : "Not finished"}</span>
        </span>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={done}
      aria-label={done ? `Bring back ${task.title}` : `Mark ${task.title} done`}
      onClick={() => act({ do: done ? "back" : "done", task: task.id })}
      className="group grid h-11 w-11 shrink-0 place-items-center rounded-full"
    >
      <span
        data-hue={task.hue}
        className={`grid h-7 w-7 place-items-center rounded-full border-2 border-edge transition-colors duration-300 ${done ? "bg-hue text-on-hue" : "bg-surface group-hover:bg-tint"}`}
      >
        {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

/** One task, with what can be changed about it opening under it. */
function Row({ task, now, act, busy, editing, onEdit, compact, readOnly }: { task: TaskT; now: number; act: Act; busy: boolean; editing: boolean; onEdit: () => void; compact: boolean; readOnly: boolean }) {
  const line = facts(task, now);
  const finished = ended(task);
  return (
    <li className="min-w-0">
      <div className="flex min-h-12 items-center gap-1.5">
        <Tick task={task} act={act} busy={busy} readOnly={readOnly} />
        <div className="min-w-0 flex-1 py-1">
          <p className={`font-medium leading-snug [overflow-wrap:anywhere] ${finished ? "text-ink/65 line-through decoration-2" : ""}`}>{task.title}</p>
          {line || task.note || task.status === "stuck" ? (
            <p className="text-[0.8125rem] leading-snug text-ink/65 [overflow-wrap:anywhere]">
              {[task.status === "stuck" ? "Stuck" : "", line, task.note].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {readOnly ? null : task.status === "skipped" ? (
          <button type="button" className="chip chip-sm shrink-0" disabled={busy} onClick={() => act({ do: "back", task: task.id })}>
            Back
          </button>
        ) : !finished && !task.startedAt ? (
          <button type="button" className="chip chip-sm shrink-0" disabled={busy} aria-label={`Start ${task.title}`} onClick={() => act({ do: "start", task: task.id })}>
            <Icon name="play" className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span className="max-xs:sr-only">Start</span>
          </button>
        ) : task.startedAt ? (
          <span className="shrink-0 px-2 text-[0.8125rem] font-semibold text-accent">On it</span>
        ) : null}
        {compact || readOnly ? null : (
          <button
            type="button"
            aria-expanded={editing}
            aria-label={`Change ${task.title}`}
            onClick={onEdit}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/65 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <Icon name="pen" className="h-4 w-4" />
          </button>
        )}
      </div>
      {editing ? <EditTask task={task} act={act} busy={busy} onClose={onEdit} /> : null}
    </li>
  );
}

const clockValue = (at: string | null) => (at ? new Date(at).toTimeString().slice(0, 5) : "");

function EditTask({ task, act, busy, onClose }: { task: TaskT; act: Act; busy: boolean; onClose: () => void }) {
  const ids = useId();
  const [title, setTitle] = useState(task.title);
  const [at, setAt] = useState(clockValue(task.at));
  const [minutes, setMinutes] = useState(task.minutes ? String(task.minutes) : "");
  const length = Number(minutes);
  const valid = title.trim() && (!minutes || (Number.isInteger(length) && length >= 1 && length <= 1440));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    await act({ do: "edit", task: task.id, title: title.trim(), at: at || null, minutes: minutes ? length : null });
    onClose();
  }

  return (
    <form onSubmit={save} className="well mb-2 mt-1 grid grid-cols-1 gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_8.5rem_6.5rem]">
      <label className="block min-w-0" htmlFor={`${ids}-t`}>
        <span className="mb-1.5 block text-[0.8125rem] font-semibold text-ink/70">Task</span>
        <input id={`${ids}-t`} className="control !min-h-11 !py-2" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block min-w-0" htmlFor={`${ids}-a`}>
        <span className="mb-1.5 block text-[0.8125rem] font-semibold text-ink/70">At</span>
        <input id={`${ids}-a`} type="time" className="control !min-h-11 !py-2" value={at} onChange={(e) => setAt(e.target.value)} />
      </label>
      <label className="block min-w-0" htmlFor={`${ids}-m`}>
        <span className="mb-1.5 block text-[0.8125rem] font-semibold text-ink/70">Minutes</span>
        <input id={`${ids}-m`} className="control !min-h-11 !py-2 tabular-nums" inputMode="numeric" value={minutes} placeholder="Timer" onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 4))} />
      </label>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-3">
        <Button variant="quiet" size="sm" className="!h-11 mr-auto text-bad" disabled={busy} onClick={() => act({ do: "remove", task: task.id })}>
          Take it off
        </Button>
        <Button variant="quiet" size="sm" className="!h-11" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="secondary" size="sm" className="!h-11" disabled={busy || !valid}>
          Save
        </Button>
      </div>
    </form>
  );
}

/** The list: what's open, in order, then what's finished. */
export function TaskList({ tasks, now, act, busy, compact = false, readOnly = false }: { tasks: TaskT[]; now: number; act: Act; busy: boolean; compact?: boolean; readOnly?: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const open = tasks.filter((t) => !ended(t));
  const finished = tasks.filter(ended);
  return (
    <ul className="grid grid-cols-1 gap-0.5">
      {[...open, ...finished].map((t) => (
        <Row key={t.id} task={t} now={now} act={act} busy={busy} compact={compact} readOnly={readOnly} editing={editing === t.id} onEdit={() => setEditing(editing === t.id ? null : t.id)} />
      ))}
    </ul>
  );
}

/** Adding to the list, in the same words as telling Maru: "Gym at 6pm for 45 min". */
export function AddTask({ act, busy, id, focusRef }: { act: Act; busy: boolean; id: string; focusRef?: React.Ref<HTMLInputElement> }) {
  const [text, setText] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    const said = text.trim();
    if (!said) return;
    setText("");
    await act({ do: "add", tasks: [said] });
  }

  return (
    <form onSubmit={add} className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Add a task
      </label>
      <input
        id={id}
        ref={focusRef}
        className="control !min-h-12 min-w-0 flex-1 !rounded-full"
        placeholder="Add a task, like Gym at 6pm for 45 min"
        value={text}
        maxLength={160}
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        aria-label="Add it"
        disabled={busy || !text.trim()}
        className="press grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-edge bg-surface transition-[transform,box-shadow,opacity] duration-300 disabled:opacity-50"
      >
        <Icon name="plus" className="h-5 w-5" />
      </button>
    </form>
  );
}
