"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button, buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { REACTIONS } from "@/components/people/labels";
import type { FriendT, ReactionKind, ThreadUpdateT, Who } from "@/lib/types";

/* The pieces of a shared thread: faces, picking friends, a question before something that can't be
   taken back, cheering, and a line to post. */

export const firstOf = (name: string) => name.split(/\s+/)[0] || name;

/** "Mira", "Mira and Arjun", "Mira, Arjun and Lena". */
export function listOf(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** Up to a handful of faces, overlapping like stickers. */
export function Faces({ people, size = 32, max = 5 }: { people: Who[]; size?: number; max?: number }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <span className="flex shrink-0 items-center" aria-hidden>
      {shown.map((p, i) => (
        <span key={p.handle} className={`relative ${i ? "-ml-2.5" : ""}`} style={{ zIndex: shown.length - i }}>
          <Avatar name={p.name} hue={p.hue} size={size} />
        </span>
      ))}
      {more > 0 ? (
        <span className="relative -ml-2.5 grid place-items-center rounded-full border-2 border-edge bg-surface text-[0.75rem] font-bold" style={{ width: size, height: size }}>
          +{more}
        </span>
      ) : null}
    </span>
  );
}

/** Who something is for, with the lock. */
export function Private({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-[0.9375rem] text-ink/75 ${className}`}>
      <Icon name="lock" className="mt-[0.2rem] h-4 w-4 shrink-0" strokeWidth={1.9} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * Pick friends: everyone you follow is listed, and only those who follow you back can be picked,
 * the same rule as messages. The rest say what would make them pickable.
 */
export function PeoplePicker({
  label,
  friends,
  picked,
  onToggle,
  exclude = [],
  handle,
}: {
  label: string;
  friends: FriendT[];
  picked: string[];
  onToggle: (handle: string) => void;
  exclude?: string[];
  /** The writer's own handle: without one nobody can follow them back. */
  handle: string;
}) {
  const id = useId();
  const [find, setFind] = useState("");
  const left = friends.filter((f) => !exclude.includes(f.handle));
  const q = find.trim().toLowerCase();
  const shown = q ? left.filter((f) => f.name.toLowerCase().includes(q) || f.handle.includes(q.replace(/^@/, ""))) : left;
  if (!handle || !friends.length) {
    return (
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-[0.9375rem] text-ink/75">
          {handle
            ? "A thread can be shared with people you follow who follow you back. Find them first."
            : "A thread can be shared with people you follow who follow you back. Pick a handle first, so friends can find you."}
        </p>
        <Link href={handle ? "/people?tab=find" : "/people"} className={`${buttonClass({ variant: "secondary", size: "sm" })} mt-3 !h-11`}>
          <Icon name="search" className="h-4 w-4" />
          {handle ? "Find people" : "Pick a handle"}
        </Link>
      </div>
    );
  }
  return (
    <fieldset className="min-w-0">
      <legend className="font-semibold">{label}</legend>
      <p className="mt-0.5 text-[0.875rem] text-ink/70">People you follow who follow you back.</p>
      {left.length > 8 ? (
        <div className="mt-3">
          <label htmlFor={`${id}-find`} className="sr-only">
            Find a friend
          </label>
          <input id={`${id}-find`} className="control !min-h-11 !py-2" placeholder="Find a friend" autoComplete="off" value={find} onChange={(e) => setFind(e.target.value)} />
        </div>
      ) : null}
      {left.length ? (
        shown.length ? (
          <ul className="mt-3 grid grid-cols-1 gap-2 @lg:grid-cols-2">
            {shown.map((f) => {
              const on = picked.includes(f.handle);
              return (
                <li key={f.handle} className="min-w-0">
                  {f.mutual ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => onToggle(f.handle)}
                      className="press flex min-h-14 w-full items-center gap-3 rounded-md border-2 border-edge bg-surface px-3 py-2 text-left transition-[transform,box-shadow,background-color] duration-300 aria-checked:bg-sun aria-checked:text-on-sun"
                    >
                      <Avatar name={f.name} hue={f.hue} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold leading-tight">{f.name}</span>
                        <span className="block truncate text-[0.8125rem] opacity-75">@{f.handle}</span>
                      </span>
                      <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-edge ${on ? "bg-ink text-ground" : "bg-surface"}`}>
                        {on ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.8} /> : null}
                      </span>
                    </button>
                  ) : (
                    <div className="flex min-h-14 w-full items-center gap-3 rounded-md border-2 border-dashed border-edge/40 px-3 py-2 text-ink/70">
                      <span className="opacity-60">
                        <Avatar name={f.name} hue={f.hue} size={34} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold leading-tight">{f.name}</span>
                        <span className="block text-[0.8125rem] leading-snug">Once {firstOf(f.name)} follows you back</span>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-[0.9375rem] text-ink/75">No one by that name.</p>
        )
      ) : (
        <p className="mt-3 text-[0.9375rem] text-ink/75">Everyone you could add is on it already.</p>
      )}
    </fieldset>
  );
}

/** A question before something that can't be taken back, with the safe answer focused. */
export function Confirm({ title, body, yes, no, onYes, onNo, busy = false }: { title: string; body: string; yes: string; no: string; onYes: () => void; onNo: () => void; busy?: boolean }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
  }, []);
  return (
    <div data-hue="0" role="group" aria-label={title} className="appear rounded-md border-2 border-edge bg-tint p-3 sm:p-4">
      <p className="font-semibold text-deep">{title}</p>
      <p className="mt-1 text-[0.9375rem] text-ink/80">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="danger" onClick={onYes} disabled={busy}>
          {yes}
        </Button>
        <Button ref={keep} variant="quiet" onClick={onNo}>
          {no}
        </Button>
      </div>
    </div>
  );
}

/** A line to post: its label above, the box and the button under it. */
export function LineForm({ label, placeholder, action, onPost, max = 280, busy = false }: { label: string; placeholder: string; action: string; onPost: (text: string) => Promise<boolean>; max?: number; busy?: boolean }) {
  const id = useId();
  const [value, setValue] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || busy) return;
    if (await onPost(text)) setValue("");
  }
  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-2">
      <label htmlFor={id} className="text-[0.875rem] font-semibold">
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <input id={id} className="control !min-h-11 min-w-0 !py-2" autoComplete="off" maxLength={max} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="submit" variant="secondary" className="shrink-0" disabled={!value.trim() || busy}>
          {action}
        </Button>
      </div>
    </form>
  );
}

/** The app's four reactions as one row: tap to cheer someone on, tap again to take it back. */
export function CheerRow({ cheers, me, author, onCheer, disabled = false }: { cheers: ThreadUpdateT["cheers"]; me: string; author: string; onCheer: (kind: ReactionKind) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label={`Cheer ${author} on`} className="scale">
      {REACTIONS.map(({ kind, label }) => {
        const who = cheers[kind] ?? [];
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={who.includes(me)}
            onClick={() => onCheer(kind)}
            disabled={disabled}
            className="scale-step scale-row min-h-11 gap-1.5 px-1 text-[0.8125rem] focus-visible:-outline-offset-4 lg:min-h-10"
          >
            <span>{label}</span>
            {who.length ? <span className="tabular-nums opacity-70">{who.length}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Who cheered, in words: "Go on from Mira and you · Nice from Arjun". Empty when nobody has. */
export function cheersLine(cheers: ThreadUpdateT["cheers"], me: string, nameOf: (handle: string) => string): string {
  return REACTIONS.flatMap(({ kind, label }) => {
    const who = cheers[kind] ?? [];
    if (!who.length) return [];
    const names = [...who.filter((w) => w !== me).map(nameOf), ...(who.includes(me) ? ["you"] : [])];
    return [`${label} from ${listOf(names)}`];
  }).join(" · ");
}
