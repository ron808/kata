"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { FIELD_TYPE_META } from "@/components/builder/fieldTypes";
import { HandleField, type HandleStatus } from "@/components/settings/HandleField";
import { Button } from "@/components/shared/Button";
import { MaruColours } from "@/components/shared/MaruColours";
import { Icon } from "@/components/shared/Icon";
import { TextField } from "@/components/shared/TextField";
import { COMPANION_NAME_MAX, DEFAULT_COMPANION, NAME_IDEAS, NICKNAME_MAX } from "@/lib/companion/name";
import type { RolePreset, RoleKey } from "@/lib/types";
import { CHECK_INS, FOCUS_IDEAS, MAX_FOCUS, ROLES, type CheckIn } from "./script";

// One control per question Kata asks. Each answers through a callback; the flow decides
// what Kata says next. Chips that hold what people typed may wrap, so nothing can widen a phone.

const WRAP = "max-w-full whitespace-normal py-1.5 text-left [overflow-wrap:anywhere]";

export function RoleChoice({
  value,
  onPick,
  labelledBy,
}: {
  value: RoleKey | null;
  onPick: (role: RoleKey) => void;
  labelledBy: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {ROLES.map((r) => (
        <button key={r.key} type="button" className="chip" aria-pressed={value === r.key} onClick={() => onPick(r.key)}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function FocusPicker({
  id,
  role,
  value,
  onChange,
  labelledBy,
}: {
  id: string;
  role: RoleKey;
  value: string[];
  onChange: (next: string[]) => void;
  labelledBy: string;
}) {
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const ideas = FOCUS_IDEAS[role];
  const full = value.length >= MAX_FOCUS;
  const chips = [...value.filter((v) => !ideas.some((i) => same(i, v))), ...ideas];

  function toggle(item: string) {
    setNote(null);
    const at = value.findIndex((v) => same(v, item));
    if (at >= 0) onChange(value.filter((_, i) => i !== at));
    else if (!full) onChange([...value, item]);
  }

  function add() {
    const item = draft.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!item) return;
    if (value.some((v) => same(v, item))) setNote(`${item} is already on your list.`);
    else if (full) setNote(`That’s six. You can add more later.`);
    else {
      onChange([...value, item]);
      setNote(null);
    }
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <label htmlFor={`${id}-new`} className="sr-only">
          Something you’re working on
        </label>
        <input
          id={`${id}-new`}
          className="control min-w-0 flex-1"
          placeholder={full ? "That’s six for now" : "Add your own"}
          value={draft}
          maxLength={80}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          autoComplete="off"
          enterKeyHint="done"
        />
        <Button variant="secondary" size="lg" className="shrink-0 max-xs:px-4" onClick={add} disabled={full || !draft.trim()}>
          Add
        </Button>
      </div>
      <div role="group" aria-labelledby={labelledBy} className="mt-3 flex flex-wrap gap-2">
        {chips.map((item) => {
          const index = value.findIndex((v) => same(v, item));
          const on = index >= 0;
          return (
            <button
              key={item.toLowerCase()}
              type="button"
              className={`chip ${WRAP}`}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(item)}
            >
              {on ? (
                <span aria-hidden data-hue={index % 8} className="h-3 w-3 shrink-0 rounded-full border-[1.5px] border-edge bg-hue" />
              ) : (
                <Icon name="plus" className="h-4 w-4" strokeWidth={2} />
              )}
              {item}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-2.5 text-sm text-ink/65">
        {note ?? (value.length ? `${value.length} of ${MAX_FOCUS} added. Tap one to take it off.` : `Up to ${MAX_FOCUS}.`)}
      </p>
    </div>
  );
}

export function CheckInChoice({
  value,
  onPick,
  labelledBy,
}: {
  value: CheckIn | null;
  onPick: (value: CheckIn) => void;
  labelledBy: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="scale w-full max-w-[22rem]">
      {CHECK_INS.map((c) => (
        <button
          key={c.value}
          type="button"
          className="scale-step min-h-[3.75rem]"
          aria-pressed={value === c.value}
          onClick={() => onPick(c.value)}
        >
          <span aria-hidden className="flex items-center gap-0.5">
            {c.value !== "evening" ? <Icon name="sun" className="h-[1.15rem] w-[1.15rem]" /> : null}
            {c.value !== "morning" ? <Icon name="moon" className="h-[1.05rem] w-[1.05rem]" /> : null}
          </span>
          <span className="text-[0.875rem]">{c.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PageChoice({
  fields,
  dropped,
  onChange,
  labelledBy,
}: {
  fields: RolePreset["fields"];
  dropped: number[];
  onChange: (dropped: number[]) => void;
  labelledBy: string;
}) {
  const [note, setNote] = useState<string | null>(null);
  const kept = fields.length - dropped.length;

  function toggle(i: number, keep: boolean) {
    if (!keep && kept <= 1) {
      setNote("Your page needs at least one question.");
      return;
    }
    setNote(null);
    onChange(keep ? dropped.filter((d) => d !== i) : [...dropped, i].sort((a, b) => a - b));
  }

  return (
    <div role="group" aria-labelledby={labelledBy}>
      <ul className="well grid grid-cols-1 gap-1 p-1.5">
        {fields.map((f, i) => {
          const on = !dropped.includes(i);
          const meta = FIELD_TYPE_META[f.type];
          return (
            <li key={`${f.type}-${f.label}`}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-2.5 py-2 transition-colors hover:bg-ink/[0.05]">
                <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => toggle(i, e.target.checked)}
                    className="peer absolute inset-0 m-0 h-6 w-6 cursor-pointer appearance-none rounded-[7px] border-2 border-edge bg-surface transition-colors duration-300 checked:bg-sun"
                  />
                  <Icon
                    name="check"
                    className="pointer-events-none relative h-4 w-4 text-on-sun opacity-0 transition-opacity peer-checked:opacity-100"
                    strokeWidth={2.6}
                  />
                </span>
                <span
                  aria-hidden
                  data-hue={meta?.hue ?? 0}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-edge bg-hue text-on-hue transition-opacity ${on ? "" : "opacity-40"}`}
                >
                  <Icon name={meta?.icon ?? "text-short"} className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className={`min-w-0 flex-1 font-medium leading-snug ${on ? "" : "text-ink/65 line-through decoration-2"}`}>
                  {f.label}
                </span>
                <span className="sr-only">{on ? ", on your page" : ", dropped"}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="mt-2.5 text-sm text-ink/65">
        {note ?? (dropped.length ? `Keeping ${kept} of ${fields.length}.` : "All of them stay unless you untick one.")}
      </p>
    </div>
  );
}

export function HandleChoice({
  id,
  value,
  onChange,
  status,
  error,
  onUse,
  onSkip,
  labelledBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  status: HandleStatus;
  error: string | null;
  onUse: () => void;
  onSkip: () => void;
  labelledBy: string;
}) {
  const ready = status.state === "free" || status.state === "yours" || status.state === "unknown";
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (ready) onUse();
  }
  return (
    <form onSubmit={onSubmit} aria-labelledby={labelledBy} className="w-full max-w-[26rem]">
      <HandleField id={id} value={value} onChange={onChange} status={status} error={error} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary" disabled={!ready} className="max-w-full">
          <span className="truncate">{ready ? `Use @${value}` : "Use this handle"}</span>
        </Button>
        <Button variant="quiet" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </form>
  );
}

/** What the writer is called, and what they call their companion. Both start filled in. */
export function NamesChoice({
  nickname,
  companion,
  onNickname,
  onCompanion,
  hue,
  onHue,
  onDone,
  labelledBy,
  editing,
}: {
  nickname: string;
  companion: string;
  onNickname: (value: string) => void;
  onCompanion: (value: string) => void;
  /** The colour it wears, or null for vermilion. */
  hue: number | null;
  onHue: (value: number | null) => void;
  onDone: () => void;
  labelledBy: string;
  editing: boolean;
}) {
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onDone();
  }
  return (
    <form onSubmit={onSubmit} aria-labelledby={labelledBy} className="w-full max-w-[26rem]">
      <div className="grid grid-cols-1 gap-4">
        <TextField id="names-you" label="Call me" value={nickname} maxLength={NICKNAME_MAX} autoComplete="nickname" onChange={(e) => onNickname(e.target.value)} />
        <TextField
          id="names-companion"
          label="And you’re"
          value={companion}
          maxLength={COMPANION_NAME_MAX}
          placeholder={DEFAULT_COMPANION}
          autoComplete="off"
          onChange={(e) => onCompanion(e.target.value)}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Name ideas">
        {NAME_IDEAS.map((idea) => (
          <button key={idea} type="button" className="chip chip-sm" aria-pressed={companion.trim() === idea} onClick={() => onCompanion(idea)}>
            {idea}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <MaruColours value={hue} onChange={onHue} label="My colour" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" variant="secondary">
          {editing ? "Done" : "That’s us"}
          {editing ? null : <Icon name="arrow" className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
