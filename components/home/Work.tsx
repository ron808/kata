"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Icon, type IconName } from "@/components/shared/Icon";
import { FIELDS_MAX, TRACKED_KINDS, guessFields, parseTrack, specLabel, specText } from "@/lib/companion/fields";
import type { Choice, ChoiceInput, KataMessage, Receipt, ReceiptKind } from "@/lib/types";

/*
 * Maru's work, as stickers under its message: receipts for what it did (each one opens the
 * thing it touched) and choices for what it could do next, which run when tapped. A choice that
 * needs something Maru doesn't know (what the habit is, how far you walked) is a small form,
 * and one that has everything can still be opened to change it first.
 */

// A thread or a person brings its own hue; everything else has one by kind.
const HUE: Record<ReceiptKind, number> = { thread: 3, memory: 4, page: 1, question: 2, settings: 6, names: 5, people: 5, share: 0, message: 2, mission: 2, breakdown: 1, open: 7 };
const ICON: Record<ReceiptKind, IconName> = {
  thread: "threads",
  memory: "star",
  page: "pen",
  question: "page",
  settings: "settings",
  names: "smile",
  people: "people",
  share: "share",
  message: "chat",
  breakdown: "chart",
  mission: "target",
  open: "arrow",
};

const ROW = "flex w-full items-center gap-3 rounded-md border-2 border-edge bg-surface px-3 py-2.5 text-left";

/** What Maru did. Each one with somewhere to go opens it. */
export function Receipts({ done }: { done: Receipt[] }) {
  return (
    <ul aria-label="Done" className="grid w-full max-w-[25rem] grid-cols-1 gap-2">
      {done.map((d, i) => {
        const body = (
          <>
            <span
              data-hue={d.hue ?? HUE[d.kind]}
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-edge bg-hue text-on-hue"
            >
              <Icon name={ICON[d.kind]} className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
              <span className="absolute -bottom-1 -right-1 grid h-[1.125rem] w-[1.125rem] place-items-center rounded-full border-2 border-edge bg-surface text-ink">
                <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3.2} />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="sr-only">Done: </span>
              <span className="block font-semibold leading-tight [overflow-wrap:anywhere]">{d.text}</span>
              {d.detail ? <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-ink/70 [overflow-wrap:anywhere]">{d.detail}</span> : null}
            </span>
            {d.href ? <Icon name="arrow" className="h-4 w-4 shrink-0 text-ink/60" /> : null}
          </>
        );
        return (
          <li key={i} className="appear" style={i ? { animationDelay: `${i * 70}ms` } : undefined}>
            {d.href ? (
              <Link href={d.href} className={`press ${ROW} transition-[transform,box-shadow] duration-300`}>
                {body}
              </Link>
            ) : (
              <div className={`${ROW} shadow-sticker-sm`}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type Values = Record<string, string>;
/** As offered, it has what it needs: one tap can run it. */
const filled = (inputs: ChoiceInput[]) => inputs.every((i) => !i.required || i.value.trim()) && inputs.some((i) => i.value.trim());

/**
 * What Maru offers to do. A tap runs it as offered; a draft others would see (a reply, a
 * moment) can be changed first; a form is filled in first. Once one is chosen, the rest step back.
 */
export function Choices({
  message,
  running,
  onChoose,
}: {
  message: KataMessage;
  /** The choice being run right now, if it's one of these. */
  running: number | null;
  onChoose: (index: number | "no", edit?: string, values?: Values) => void;
}) {
  const answer = message.answer?.startsWith("do:") ? message.answer.slice(3) : null;
  const open = !message.answer && running === null;
  const drafts = message.choices.filter((c) => c.editable).length;
  // A lone form that needs filling in opens at once, unless the message has quick answers of
  // its own (a check-in, where logging is the extra); otherwise one opens when tapped.
  const [expanded, setExpanded] = useState<number | null>(() => {
    const forms = message.choices.filter((c) => c.inputs.length && !c.editable);
    const only = message.choices.length === 1 && forms.length === 1;
    return only && !filled(forms[0].inputs) && !message.answer && !message.replies.length ? 0 : null;
  });
  return (
    <div role="group" aria-label="Choices" className="grid w-full max-w-[25rem] grid-cols-1 gap-2">
      {message.choices.map((c, i) => {
        const chosen = answer === String(i) || running === i;
        // Settled: another choice was made, or the message was answered another way (a check-in's "Done").
        const props = { choice: c, chosen, open, working: running === i, settled: Boolean(message.answer) && !chosen, onChoose: (edit?: string, values?: Values) => onChoose(i, edit, values) };
        if (c.editable) return <Draft key={i} {...props} primary={drafts === 1} />;
        if (c.inputs.length) {
          return (
            <FormChoice
              key={i}
              {...props}
              expanded={expanded === i}
              onExpand={(on) => setExpanded(on ? i : null)}
              primary={message.choices.length === 1}
            />
          );
        }
        return <Offer key={i} {...props} />;
      })}
      {/* A check-in has its own answers, which say no better than "Not now". */}
      {!message.answer && !message.replies.length ? (
        <button type="button" className="chip chip-sm justify-self-start" disabled={!open} onClick={() => onChoose("no")}>
          Not now
        </button>
      ) : answer === "no" ? (
        <p className="px-1 text-[0.8125rem] text-ink/65">Skipped.</p>
      ) : null}
    </div>
  );
}

interface ChoiceProps {
  choice: Choice;
  chosen: boolean;
  open: boolean;
  working: boolean;
  /** Another one was chosen. */
  settled: boolean;
  onChoose: (edit?: string, values?: Values) => void;
}

function Working() {
  return (
    <span className="typing shrink-0" role="status" aria-label="Working">
      <i />
      <i />
      <i />
    </span>
  );
}

function Offer({ choice: c, chosen, open, working, settled, onChoose }: ChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      disabled={!open}
      onClick={() => onChoose()}
      className={`${open ? "press" : ""} ${ROW} transition-[transform,box-shadow,opacity,background-color] duration-300 ${
        chosen ? "!bg-sun text-on-sun" : settled ? "opacity-45" : ""
      } ${!open && !chosen ? "shadow-none" : !open ? "shadow-sticker-sm" : ""}`}
    >
      <OfferBody choice={c} chosen={chosen} />
      {working ? <Working /> : <Icon name={chosen ? "check" : c.public ? "globe" : "plus"} className="h-[1.1rem] w-[1.1rem] shrink-0" strokeWidth={chosen ? 2.6 : 2} />}
    </button>
  );
}

function OfferBody({ choice: c, chosen }: { choice: Choice; chosen: boolean }) {
  return (
    <>
      <span data-hue={HUE[c.kind]} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-edge bg-tint text-deep">
        <Icon name={ICON[c.kind]} className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight [overflow-wrap:anywhere]">{c.label}</span>
        {c.detail ? (
          <span className={`mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug [overflow-wrap:anywhere] ${chosen ? "opacity-80" : "text-ink/70"}`}>{c.detail}</span>
        ) : null}
      </span>
    </>
  );
}

/**
 * A choice with a form. Complete, it's one tap like any other, with a pen to open it and change
 * things first; missing something, a tap opens it. Filling it in costs no tokens: the server
 * runs the choice with what was entered.
 */
function FormChoice({
  choice: c,
  chosen,
  open,
  working,
  settled,
  onChoose,
  expanded,
  onExpand,
  primary,
}: ChoiceProps & { expanded: boolean; onExpand: (on: boolean) => void; primary: boolean }) {
  const id = useId();
  const [values, setValues] = useState<Values>(() => Object.fromEntries(c.inputs.map((i) => [i.key, i.value])));
  // What it keeps track of follows the name as it's typed, until it's changed by hand.
  const [ownTrack, setOwnTrack] = useState(false);
  const ready = filled(c.inputs);
  const kind = values.kind;
  const shown = c.inputs.filter((i) => !(i.key === "track" && "kind" in values && kind && !TRACKED_KINDS.has(kind)));
  const valid =
    shown.every((i) => !i.required || values[i.key]?.trim()) &&
    shown.some((i) => values[i.key]?.trim()) &&
    shown.every((i) => i.type !== "number" || !values[i.key]?.trim() || /^-?\d+(?:[.,]\d+)?$/.test(values[i.key].trim()));

  function set(key: string, value: string) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "title" && "track" in v && !ownTrack) next.track = guessFields(value, next.kind || null).map(specText).join(", ");
      return next;
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!open || !valid) return;
    const hidden = c.inputs.filter((i) => !shown.includes(i)).map((i) => [i.key, ""]);
    onChoose(undefined, { ...values, ...Object.fromEntries(hidden) });
  }

  // Not open: a row, as one tap or to open the form.
  if (!expanded || (!open && !working)) {
    return (
      <div
        className={`${ROW} !gap-0 !p-0 transition-[opacity,background-color] duration-300 ${chosen ? "!bg-sun text-on-sun shadow-sticker-sm" : settled ? "opacity-45" : open ? "shadow-sticker-sm" : ""}`}
      >
        <button
          type="button"
          aria-pressed={ready ? chosen : undefined}
          aria-expanded={ready ? undefined : false}
          disabled={!open}
          onClick={() => (ready ? onChoose() : onExpand(true))}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[0.875rem] px-3 py-2.5 text-left transition-colors enabled:hover:bg-ink/[0.03]"
        >
          <OfferBody choice={c} chosen={chosen} />
          {working ? <Working /> : <Icon name={chosen ? "check" : ready ? "plus" : "pen"} className="h-[1.1rem] w-[1.1rem] shrink-0" strokeWidth={chosen ? 2.6 : 2} />}
        </button>
        {ready && open ? (
          <button
            type="button"
            onClick={() => onExpand(true)}
            aria-label={`Change before: ${c.label}`}
            title="Change it first"
            className="rule grid h-auto min-h-11 w-11 shrink-0 place-items-center self-stretch rounded-r-[0.875rem] border-l-2 text-ink/70 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <Icon name="pen" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const numbers = shown.filter((i) => i.type === "number");
  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-label`}
      className="appear rounded-md border-2 border-edge bg-surface p-3 shadow-sticker-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
    >
      <div className="flex items-center gap-3">
        <span data-hue={HUE[c.kind]} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-edge bg-tint text-deep">
          <Icon name={ICON[c.kind]} className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
        </span>
        <p id={`${id}-label`} className="min-w-0 flex-1 font-semibold leading-tight [overflow-wrap:anywhere]">
          {c.label}
        </p>
        <button
          type="button"
          onClick={() => onExpand(false)}
          disabled={working}
          aria-label="Close the form"
          className="-mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/65 transition-colors hover:bg-ink/[0.06] hover:text-ink"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <fieldset disabled={working} className="mt-3 grid min-w-0 grid-cols-1 gap-3">
        {shown.map((i) =>
          i.type === "number" ? null : (
            <Field key={i.key} id={`${id}-${i.key}`} input={i} value={values[i.key] ?? ""} onChange={(v) => set(i.key, v)} onTrack={() => setOwnTrack(true)} />
          )
        )}
        {numbers.length ? (
          <div className={`grid min-w-0 gap-3 ${numbers.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {numbers.map((i) => (
              <Field key={i.key} id={`${id}-${i.key}`} input={i} value={values[i.key] ?? ""} onChange={(v) => set(i.key, v)} />
            ))}
          </div>
        ) : null}
      </fieldset>
      <div className="rule mt-3 flex items-center justify-end gap-2 border-t-2 pt-3">
        <Button type="submit" size="sm" variant={primary ? "primary" : "secondary"} disabled={!open || !valid}>
          {working ? (
            "Saving…"
          ) : (
            <>
              <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
              {c.action || "Do it"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

const LABEL = "mb-1.5 block text-[0.8125rem] font-semibold text-ink/70";

/** One input on a form. */
function Field({ id, input: i, value, onChange, onTrack }: { id: string; input: ChoiceInput; value: string; onChange: (v: string) => void; onTrack?: () => void }) {
  if (i.type === "pick") {
    return (
      <div role="group" aria-labelledby={`${id}-l`}>
        <p id={`${id}-l`} className={LABEL}>
          {i.label}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {i.options.map((o) => (
            <button key={o.value} type="button" className="chip chip-sm" aria-pressed={value === o.value} onClick={() => onChange(value === o.value && !i.required ? "" : o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (i.type === "list") return <ListField id={id} input={i} value={value} onChange={onChange} onTouch={onTrack} />;
  if (i.type === "date") {
    const quick: [string, number][] = [
      ["Today", 0],
      ["Tomorrow", 1],
      ["In a week", 7],
    ];
    return (
      <div>
        <label htmlFor={id} className={LABEL}>
          {i.label}
        </label>
        <input id={id} type="date" className="control !min-h-11 !py-2" value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {quick.map(([label, add]) => (
            <button key={label} type="button" className="chip chip-sm" onClick={() => onChange(localDay(add))}>
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (i.type === "number") {
    return (
      <div className="min-w-0">
        <label htmlFor={id} className={LABEL}>
          {i.label}
        </label>
        <span className="relative block">
          <input
            id={id}
            className={`control !min-h-11 !py-2 tabular-nums ${i.unit ? "!pr-12" : ""}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder={i.placeholder || "0"}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
          />
          {i.unit ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.875rem] text-ink/65">{i.unit}</span> : null}
        </span>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {i.label}
      </label>
      <input
        id={id}
        className="control !min-h-11 !py-2"
        autoComplete="off"
        maxLength={i.key === "title" ? 60 : i.key === "tasks" ? 300 : 200}
        placeholder={i.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {i.options.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Ideas">
          {i.options.map((o) => (
            <button key={o.value} type="button" className="chip chip-sm" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A few short items, like what a thread keeps track of: chips to drop, a line to add one. */
function ListField({ id, input: i, value, onChange, onTouch }: { id: string; input: ChoiceInput; value: string; onChange: (v: string) => void; onTouch?: () => void }) {
  const [adding, setAdding] = useState("");
  const items = parseTrack(value).map(specText);
  const full = items.length >= FIELDS_MAX;
  function save(next: string[]) {
    onTouch?.();
    onChange(next.join(", "));
  }
  function add() {
    const [spec] = parseTrack([adding]);
    if (!spec || full) return;
    save([...items, specText(spec)]);
    setAdding("");
  }
  return (
    <div role="group" aria-labelledby={`${id}-l`}>
      <p id={`${id}-l`} className={LABEL}>
        {i.label}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="chip chip-sm !pr-2.5"
            onClick={() => save(items.filter((x) => x !== item))}
            aria-label={`Don’t keep track of ${specLabel(item)}`}
          >
            {specLabel(item)}
            <Icon name="close" className="h-3.5 w-3.5 text-ink/60" strokeWidth={2.4} />
          </button>
        ))}
        {!items.length ? <span className="text-[0.8125rem] text-ink/65">Nothing yet</span> : null}
      </div>
      {!full ? (
        <div className="mt-2 flex items-center gap-1.5">
          <label htmlFor={`${id}-add`} className="sr-only">
            Add something to keep track of
          </label>
          <input
            id={`${id}-add`}
            className="control !min-h-11 !py-2"
            placeholder="Add one, like steps"
            autoComplete="off"
            maxLength={40}
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            onClick={add}
            disabled={!adding.trim()}
            aria-label="Add it"
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-edge bg-surface transition-[transform,box-shadow,opacity] duration-300 disabled:opacity-45"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** A local yyyy-mm-dd, days from the writer's today, which runs until 4am. */
function localDay(add: number): string {
  const d = new Date(Date.now() - 4 * 3_600_000);
  d.setDate(d.getDate() + add);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A reply, a moment or a new bio in Maru's draft, to change or post as it is. */
function Draft({ choice: c, chosen, open, working, settled, onChoose, primary }: ChoiceProps & { primary: boolean }) {
  const [text, setText] = useState(c.detail);
  const id = useId();
  const profile = c.kind === "settings";
  const audience =
    c.kind === "share"
      ? c.label.endsWith("friends")
        ? "Your friends will see this"
        : "Everyone will see this"
      : profile
        ? "Shows on your profile"
        : c.kind === "message"
          ? `Only ${c.label.replace(/^Send to /, "")} sees this`
          : "Posted as a reply";
  // Where Maru didn't know something, it leaves a blank like [book] to fill in.
  const blank = text.match(/\[[^\]\n]{1,30}\]/)?.[0];
  return (
    <div
      className={`rounded-md border-2 border-edge bg-surface p-3 transition-opacity duration-300 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${
        chosen ? "shadow-sticker-sm" : settled ? "opacity-45" : "shadow-sticker-sm"
      }`}
    >
      <label htmlFor={id} className="sr-only">
        {c.kind === "share" ? "Moment" : profile ? c.label.replace(/^Save /, "Your ") : c.kind === "message" ? "Message" : "Reply"}
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!open}
        maxLength={c.max || 500}
        placeholder={c.kind === "share" ? "What happened?" : profile ? "In your words" : "Write a reply"}
        rows={Math.min(5, Math.max(2, Math.ceil(text.length / 40)))}
        className="writing block !text-[0.9375rem] leading-snug [field-sizing:content] disabled:opacity-100"
      />
      <div className="rule mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t-2 pt-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-ink/65">
          <Icon name={blank && open ? "pen" : c.kind === "share" ? "globe" : profile ? "user" : c.kind === "message" ? "lock" : "chat"} className="h-4 w-4 shrink-0" />
          {chosen && !working ? (profile ? "Saved" : c.kind === "message" ? "Sent" : "Posted") : blank && open ? `Fill in ${blank} first` : audience}
          {c.max && open && !blank ? <span className="tabular-nums text-ink/65"> · {c.max - text.length} left</span> : null}
        </span>
        <Button
          size="sm"
          variant={primary ? "primary" : "secondary"}
          disabled={!open || !text.trim() || Boolean(blank)}
          onClick={() => onChoose(text.trim() !== c.detail ? text.trim() : undefined)}
        >
          {working ? (profile ? "Saving…" : c.kind === "message" ? "Sending…" : "Posting…") : chosen ? (
            <>
              <Icon name="check" className="h-4 w-4" strokeWidth={2.6} />
              Done
            </>
          ) : (
            <>
              <Icon name={profile ? "check" : "send"} className="h-4 w-4" strokeWidth={profile ? 2.4 : 2} />
              {c.label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
