"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Status } from "@/components/shared/Status";
import { REACTIONS } from "@/components/people/labels";
import { stepsFor } from "@/lib/companion/steps";
import type { ReactionKind, ThreadStatus, ThreadT } from "@/lib/types";
import { FRIENDS, inWords, listOf, metaOf, type Cheers, type DemoThread, type Who } from "./data";

/* The pieces all three versions share: faces, the people picker, cheering, the line that says
   who sees something, and the box of things to try. */

/** Up to a handful of faces, overlapping like stickers. */
export function Faces({ people, size = 32, max = 5 }: { people: Who[]; size?: number; max?: number }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <span className="flex shrink-0 items-center" aria-hidden>
      {shown.map((p, i) => (
        <span key={p.id} className={`relative ${i ? "-ml-2.5" : ""}`} style={{ zIndex: shown.length - i }}>
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

/** "Private to the four of you": who something is for, with the lock. */
export function Private({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-[0.9375rem] text-ink/75 ${className}`}>
      <Icon name="lock" className="mt-[0.2rem] h-4 w-4" strokeWidth={1.9} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** The private line for a group: "Private to the two of you", or just you so far. */
export function privateTo(members: number, noun: string): string {
  return members > 1 ? `Private to the ${inWords(members)} of you: no one else on Kata sees this ${noun}.` : `Just you so far: no one else on Kata sees this ${noun}.`;
}

/** The things to try that a real person would do: someone else's update, their view. */
export function TryBar({ children }: { children: ReactNode }) {
  return (
    <div role="group" aria-label="Try it" className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed border-edge/45 px-3 py-2.5">
      <p className="mr-1 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink/70">
        <Icon name="flask" className="h-4 w-4" />
        Try it
      </p>
      {children}
    </div>
  );
}

export function TryButton({ who, onClick, disabled, children }: { who?: Who | null; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={`chip chip-sm ${who ? "!pl-1.5" : ""}`} onClick={onClick} disabled={disabled}>
      {who ? <Avatar name={who.name} hue={who.hue} size={24} /> : null}
      {children}
    </button>
  );
}

/** The others' view, for trying: what they see, labelled, and nothing in it can be pressed. */
export function ViewingAs({ who, place, onBack }: { who: Who; place: string; onBack: () => void }) {
  return (
    <div data-hue={who.hue} className="appear flex flex-wrap items-center gap-3 rounded-lg border-2 border-edge bg-tint px-4 py-3 text-deep">
      <Avatar name={who.name} hue={who.hue} size={40} />
      <p className="min-w-0 flex-1 basis-52 leading-snug">
        <span className="block font-semibold">
          {place}, as {who.first} sees it
        </span>
        <span className="text-[0.875rem]">A preview: nothing in it can be pressed.</span>
      </p>
      <Button variant="secondary" size="sm" className="!h-11" onClick={onBack}>
        Back to yours
      </Button>
    </div>
  );
}

/** What someone in it can't see, said where their preview is. */
export function NotHere({ who, items }: { who: Who; items: string[] }) {
  return (
    <section aria-label={`What ${who.first} doesn’t see`} className="rounded-lg border-2 border-dashed border-edge/50 px-5 py-5 sm:px-6">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="lock" className="h-4 w-4" strokeWidth={1.9} />
        Not here, and {who.first} can’t tell they exist
      </p>
      <ul className="mt-2.5 grid gap-1.5 text-[0.9375rem] text-ink/80">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/50" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Who sees what, in true words: the people it's shared with on one side, what stays private on the other. */
export function WhoSees({ people, title, they, kept, footer }: { people: Who[]; title: string; they: string[]; kept: string[]; footer?: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="card p-4 sm:p-6">
      <h2 id={id} className="font-display text-display-s">
        Who sees what
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="well p-4 sm:p-5">
          <div className="flex min-h-9 items-center gap-3">
            {people.length ? <Faces people={people} size={30} max={4} /> : null}
            <h3 className="font-semibold leading-tight">{title}</h3>
          </div>
          <ul className="mt-3 grid gap-2 text-[0.9375rem]">
            {they.map((t) => (
              <li key={t} className="flex gap-2.5">
                <Icon name="eye" className="mt-[0.2rem] h-4 w-4 text-ink/70" />
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="well p-4 sm:p-5">
          <div className="flex min-h-9 items-center gap-3">
            <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-edge bg-surface">
              <Icon name="lock" className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <h3 className="font-semibold leading-tight">Stays private</h3>
          </div>
          <ul className="mt-3 grid gap-2 text-[0.9375rem]">
            {kept.map((t) => (
              <li key={t} className="flex gap-2.5">
                <Icon name="lock" className="mt-[0.2rem] h-4 w-4 text-ink/70" strokeWidth={1.9} />
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {footer ? <p className="mt-4 max-w-3xl text-[0.875rem] text-ink/70">{footer}</p> : null}
    </section>
  );
}

/** "Your other threads: Visa paperwork, Run 3x a week and 3 more". */
export function someOf(titles: string[], max = 2): string {
  if (titles.length <= max + 1) return listOf(titles);
  return `${titles.slice(0, max).join(", ")} and ${titles.length - max} more`;
}

/* ── People ─────────────────────────────────────────────────────────── */

/**
 * Pick people: everyone you follow, and only those who follow you back can be picked, the
 * same rule as messages. The rest say what would make them pickable.
 */
export function PeoplePicker({ label, picked, onToggle, exclude = [] }: { label: string; picked: string[]; onToggle: (id: string) => void; exclude?: string[] }) {
  const friends = FRIENDS.filter((f) => !exclude.includes(f.id));
  return (
    <fieldset className="min-w-0">
      <legend className="font-semibold">{label}</legend>
      <p className="mt-0.5 text-[0.875rem] text-ink/70">People you follow who follow you back.</p>
      {friends.length ? (
        <ul className="mt-3 grid grid-cols-1 gap-2 @lg:grid-cols-2">
          {friends.map((f) => {
            const on = picked.includes(f.id);
            return (
              <li key={f.id} className="min-w-0">
                {f.mutual ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => onToggle(f.id)}
                    className="press flex min-h-14 w-full items-center gap-3 rounded-md border-2 border-edge bg-surface px-3 py-2 text-left transition-[transform,box-shadow,background-color] duration-300 aria-checked:bg-sun aria-checked:text-on-sun"
                  >
                    <Avatar name={f.name} hue={f.hue} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold leading-tight">{f.name}</span>
                      <span className="block truncate text-[0.8125rem] opacity-75">{f.city}</span>
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
                      <span className="block text-[0.8125rem] leading-snug">Once {f.first} follows you back</span>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[0.9375rem] text-ink/75">Everyone you could add is in it already.</p>
      )}
    </fieldset>
  );
}

/** A question before something that can't be taken back, with the safe answer focused. */
export function Confirm({ title, body, yes, no, onYes, onNo }: { title: string; body: string; yes: string; no: string; onYes: () => void; onNo: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
  }, []);
  return (
    <div data-hue="0" role="group" aria-label={title} className="appear rounded-md border-2 border-edge bg-tint p-3 sm:p-4">
      <p className="font-semibold text-deep">{title}</p>
      <p className="mt-1 text-[0.9375rem] text-ink/80">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="danger" onClick={onYes}>
          {yes}
        </Button>
        <Button ref={keep} variant="quiet" onClick={onNo}>
          {no}
        </Button>
      </div>
    </div>
  );
}

/* ── Threads ────────────────────────────────────────────────────────── */

/** A thread's dot in its own colour. */
export function Dot({ hue, size = "h-3.5 w-3.5" }: { hue: number; size?: string }) {
  return <span aria-hidden data-hue={hue % 8} className={`${size} shrink-0 rounded-full border-2 border-edge bg-hue`} />;
}

/** Where a thread is: its status (habits say whether today's done instead), then its few words. */
export function ThreadState({ t, className = "" }: { t: DemoThread; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.875rem] ${className}`}>
      {t.kind !== "habit" ? <Status status={t.status} /> : null}
      {metaOf(t) ? <span className="text-ink/70">{t.kind !== "habit" ? "· " : ""}{metaOf(t)}</span> : null}
    </p>
  );
}

/** What ThreadSteps needs from a demo thread. A habit done today was last touched now. */
export function forSteps(t: DemoThread, now: string): Pick<ThreadT, "title" | "kind" | "status" | "streak" | "lastTouchedAt"> {
  return { title: t.title, kind: t.kind, status: t.status, streak: t.streak, lastTouchedAt: t.doneToday ? now : new Date(Date.parse(now) - 3 * 864e5).toISOString() };
}

export const stepLabel = (t: DemoThread, step: ThreadStatus) => stepsFor(t.kind).find((s) => s.value === step)?.label ?? step;

/** A line to post: its question above, the box and the button under it. */
export function LineForm({ label, placeholder, action, onPost, inputRef }: { label: string; placeholder: string; action: string; onPost: (text: string) => void; inputRef?: Ref<HTMLInputElement> }) {
  const id = useId();
  const [value, setValue] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    onPost(text);
    setValue("");
  }
  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-2">
      <label htmlFor={id} className="text-[0.875rem] font-semibold">
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          className="control !min-h-11 min-w-0 !py-2"
          autoComplete="off"
          maxLength={200}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="shrink-0" disabled={!value.trim()}>
          {action}
        </Button>
      </div>
    </form>
  );
}

/* ── Cheers ─────────────────────────────────────────────────────────── */

/** The app's four reactions as one row: tap to cheer someone on, tap again to take it back. */
export function CheerRow({ cheers, viewer, author, onCheer }: { cheers: Cheers; viewer: string; author: string; onCheer: (kind: ReactionKind) => void }) {
  return (
    <div role="group" aria-label={`Cheer ${author} on`} className="scale">
      {REACTIONS.map(({ kind, label }) => {
        const who = cheers[kind] ?? [];
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={who.includes(viewer)}
            onClick={() => onCheer(kind)}
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
export function cheersLine(cheers: Cheers, viewer: string, nameOf: (id: string) => string): string {
  return REACTIONS.flatMap(({ kind, label }) => {
    const who = cheers[kind] ?? [];
    if (!who.length) return [];
    const names = [...who.filter((w) => w !== viewer).map(nameOf), ...(who.includes(viewer) ? ["you"] : [])];
    return [`${label} from ${listOf(names)}`];
  }).join(" · ");
}
