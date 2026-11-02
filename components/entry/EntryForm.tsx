"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { FieldRenderer, fieldInputId, isLabelable } from "./FieldRenderer";
import { FieldPrompt } from "./FieldPrompt";
import { AskCard, askDomId } from "./AskCard";
import { PageOutline } from "./PageOutline";
import { TagHues } from "./TagHues";
import type { Ask } from "./asks";
import { KataMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { asYesterday, tooEarly } from "@/lib/questions/tense";
import { useToast } from "@/components/shared/Toast";
import { countWords } from "@/lib/utils/streaks";
import type {
  EntryField,
  FieldValue,
  Template,
  TemplateField,
} from "@/lib/types";

interface EntryFormProps {
  template: Template;
  /** Kata's questions for today, answered as kata:<tag>:<id> fields. */
  asks?: Ask[];
  /** Hues of tags that belong to a thread, so a tag wears its thread's colour. */
  tagHues?: Record<string, number>;
  initialFields?: EntryField[];
  entryId?: string;
  /** The day this page is about, yyyy-mm-dd. */
  date: string;
  /** It's yesterday's page, so what looks back reads that way. */
  past: boolean;
  /** The hour where the writer is, for what's too early to ask. */
  hour: number;
  /** The way to the other open day. */
  other: { href: string; label: string } | null;
  weekday: string;
  monthDay: string;
  pageNumber: number;
}

const NUMBER_WORDS = ["No", "One", "Two", "Three"];
// The writing column, and on wide screens the outline beside it. The save bar uses the same grid.
const COLUMNS = "mx-auto w-full max-w-[46rem] px-margin xl:grid xl:max-w-[68rem] xl:grid-cols-[minmax(0,46rem)_17rem] xl:justify-center xl:gap-x-12";

const filled = (v: FieldValue | undefined) =>
  Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined;
const cardId = (id: string) => `card-${id}`;

function initialValues(template: Template, asks: Ask[], initialFields?: EntryField[]) {
  const values = Object.fromEntries(
    template.fields.map((f) => [
      f.id,
      valueForField(f, initialFields?.find((x) => x.fieldId === f.id)),
    ])
  ) as Record<string, FieldValue>;
  for (const a of asks) {
    const saved = initialFields?.find((x) => x.fieldId === a.fieldId)?.value;
    values[a.fieldId] = typeof saved === "string" ? saved : "";
  }
  return values;
}

function valueForField(
  field: TemplateField,
  initial?: EntryField
): FieldValue {
  if (initial) return initial.value as FieldValue;
  switch (field.type) {
    case "tags":
      return [];
    case "yes_no":
      return null;
    case "mood_slider":
    case "energy":
    case "number":
    case "rating":
      return null;
    default:
      return "";
  }
}

export function EntryForm({
  template,
  asks = [],
  tagHues,
  initialFields,
  entryId,
  date,
  past,
  hour,
  other,
  weekday,
  monthDay,
  pageNumber,
}: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { name } = useCompanion();
  const reduce = useReducedMotion();
  const serialize = (vals: Record<string, FieldValue>) =>
    JSON.stringify({
      date,
      fields: [
        ...template.fields.map<EntryField>((f) => ({
          fieldId: f.id,
          type: f.type,
          label: f.label,
          value: vals[f.id] ?? null,
        })),
        // Only answered questions are saved; each one files the page under its tag.
        ...asks.flatMap<EntryField>((a) => {
          const v = vals[a.fieldId];
          return typeof v === "string" && v.trim()
            ? [{ fieldId: a.fieldId, type: "long_text", label: a.text, value: v }]
            : [];
        }),
      ],
    });
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    initialValues(template, asks, initialFields)
  );
  // Answered today on a page they've since switched from: the save keeps them, and they show here.
  const earlier = (initialFields ?? []).filter(
    (f) =>
      !f.fieldId.startsWith("kata:") &&
      !template.fields.some((t) => t.id === f.fieldId) &&
      (Array.isArray(f.value) ? f.value.length > 0 : typeof f.value === "string" ? f.value.trim().length > 0 : f.value !== null)
  );
  // What the server has. Opening the page is not an edit, so an untouched page is never saved.
  const [savedPayload, setSavedPayload] = useState(() =>
    serialize(initialValues(template, asks, initialFields))
  );
  // What can't be answered yet ("What did you eat for dinner?" at nine) waits, unless it's been answered.
  const [later, setLater] = useState<Set<string>>(
    () =>
      new Set(
        past
          ? []
          : template.fields
              .filter((f) => f.type !== "divider" && tooEarly(f.label, hour) && !filled(initialFields?.find((x) => x.fieldId === f.id)?.value))
              .map((f) => f.id)
      )
  );
  const say = (text: string) => (past ? asYesterday(text) : text);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [sealed, setSealed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saved = useRef(Boolean(entryId));
  // Kata's questions start open once answered.
  const [openAsks, setOpenAsks] = useState<Set<string>>(
    () => new Set(asks.filter((a) => filled(initialFields?.find((f) => f.fieldId === a.fieldId)?.value)).map((a) => a.fieldId))
  );

  const payload = serialize(values);
  const dirty = payload !== savedPayload;

  const wordCount = useMemo(() => {
    let total = 0;
    for (const v of Object.values(values)) {
      if (typeof v === "string") total += countWords(v);
    }
    return total;
  }, [values]);

  function setValue(id: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  // Maru wrote on today's page from the dock: add the same words here, so the next autosave
  // keeps them alongside anything typed since the last save.
  useEffect(() => {
    const onWrite = (e: Event) => {
      const { fieldId, text } = (e as CustomEvent<{ fieldId: string; text: string }>).detail;
      setValues((prev) => {
        const cur = prev[fieldId];
        return { ...prev, [fieldId]: typeof cur === "string" && cur.trim() ? `${cur.trimEnd()}\n${text}` : text };
      });
    };
    window.addEventListener("maru:page-write", onWrite);
    return () => window.removeEventListener("maru:page-write", onWrite);
  }, []);

  // Auto-save ten seconds after the last change.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSave({ silent: true });
    }, 10_000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  // Warn before leaving with words the server hasn't got yet.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function doSave(opts: { silent?: boolean; redirectAfter?: boolean } = {}) {
    if (saving) return;
    const serialized = payload;
    if (serialized === savedPayload && opts.silent) return;
    // Nothing written and nothing saved: closing isn't writing, so it costs no page and no streak.
    if (!saved.current && !Object.values(values).some(filled)) {
      if (opts.redirectAfter) router.push("/dashboard");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Your own save (not an autosave) is when Kata reads the page properly.
        body: opts.silent ? serialized : JSON.stringify({ ...JSON.parse(serialized), final: true }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      saved.current = true;
      setSavedPayload(serialized);
      setSavedAt(Date.now());
      if (!opts.silent) toast("Page saved", "success");
      if (opts.redirectAfter) {
        setSealed(true);
        setTimeout(() => router.push("/dashboard"), 1100);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      if (!opts.silent) toast(msg, "danger");
    } finally {
      setSaving(false);
    }
  }

  function setAskOpen(fieldId: string, open: boolean) {
    setOpenAsks((prev) => {
      const next = new Set(prev);
      if (open) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  }

  /** From the outline: bring a prompt or question into view and put the caret in it. */
  function jumpTo(id: string) {
    const ask = asks.find((a) => a.fieldId === id);
    if (ask) flushSync(() => setAskOpen(ask.fieldId, true));
    const target = document.getElementById(ask ? askDomId(ask.fieldId) : cardId(id));
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    target
      .querySelector<HTMLElement>(ask ? "textarea" : 'textarea, input, [role="radio"][tabindex="0"], button')
      ?.focus({ preventScroll: true });
  }

  const status = saving
    ? "Saving…"
    : dirty
      ? "Unsaved changes"
      : savedAt
        ? `Saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : entryId
          ? "Saved"
          : "Not saved yet";

  const waiting = template.fields.filter((f) => later.has(f.id));
  const outlineFields = template.fields
    .filter((f) => f.type !== "divider" && !later.has(f.id))
    .map((f) => ({ id: f.id, label: say(f.label), done: filled(values[f.id]) }));
  const outlineAsks = asks.map((a) => ({ id: a.fieldId, label: `#${a.tag}`, hue: a.hue, done: filled(values[a.fieldId]) }));

  return (
    <TagHues hues={tagHues ?? {}}>
      <div className={`${COLUMNS} pb-44 pt-[clamp(1.25rem,4vw,3rem)]`}>
        <div className="min-w-0">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex -rotate-[3deg] items-center rounded-full border-2 border-edge bg-surface px-3 py-0.5 font-display text-[1.15rem] shadow-sticker-sm">
                  Page {pageNumber.toLocaleString("en-US")}
                </span>
                {entryId ? <span className="text-[0.9375rem] font-medium text-ink/70">{past ? "Started earlier" : "Started earlier today"}</span> : null}
              </p>
              <h1 className="mt-4 font-display text-display-l">
                <span className="block">{past ? "Yesterday," : `${weekday},`}</span>
                <span className="mark">{past ? `${weekday}, ${monthDay}` : monthDay}</span>
              </h1>
              <p className="mt-5 max-w-[34rem] text-lede text-ink/75">
                {past ? "While you still remember it." : "Write what mattered."} {name} reads the page when you save it and keeps track of what’s moving.
              </p>
              {other ? (
                <Link href={other.href} onClick={() => dirty && void doSave({ silent: true })} className="link mt-3 inline-flex min-h-11 items-center text-[0.9375rem] font-semibold">
                  {other.label}
                </Link>
              ) : null}
            </div>
            <Link
              href="/dashboard"
              onClick={() => dirty && void doSave({ silent: true })}
              aria-label="Close this page"
              className="chip !h-11 !w-11 !min-h-0 shrink-0 !px-0"
            >
              <Icon name="close" className="h-5 w-5" />
            </Link>
          </header>

          <div className="mt-10 grid grid-cols-1 gap-6">
            {template.fields.filter((f) => !later.has(f.id)).map((field, idx) =>
              field.type === "divider" ? (
                <div key={field.id} className="pt-4">
                  <FieldRenderer field={field} value={null} />
                </div>
              ) : (
                <div
                  key={field.id}
                  id={cardId(field.id)}
                  className="card appear p-5 [animation-delay:var(--delay)] motion-reduce:[animation-delay:0ms] has-[.writing:focus-visible]:shadow-[5px_5px_0_var(--accent)] sm:p-7"
                  style={{ ["--delay" as string]: `${Math.min(idx, 6) * 50}ms` }}
                >
                  <FieldPrompt
                    as={isLabelable(field) ? "label" : "p"}
                    htmlFor={fieldInputId(field)}
                  >
                    {say(field.label)}
                  </FieldPrompt>
                  <div className="mt-4">
                    <FieldRenderer field={{ ...field, label: say(field.label) }} value={values[field.id]} onChange={(v) => setValue(field.id, v)} />
                  </div>
                </div>
              )
            )}
          </div>

          {waiting.length > 0 ? (
            <section aria-labelledby="later-today" className="mt-14">
              <h2 id="later-today" className="font-display text-display-s">
                Later today
              </h2>
              <p className="mt-1.5 max-w-[34rem] text-[0.9375rem] text-ink/70">
                These make more sense once more of the day has happened. They’ll be here, or answer one now.
              </p>
              <ul className="card mt-6 grid grid-cols-1 gap-2 p-3 sm:p-4">
                {waiting.map((f) => (
                  <li key={f.id} className="well flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                    <span className="min-w-0 flex-1 basis-56 font-semibold">{f.label}</span>
                    <button
                      type="button"
                      className="chip chip-sm"
                      onClick={() =>
                        setLater((prev) => {
                          const next = new Set(prev);
                          next.delete(f.id);
                          return next;
                        })
                      }
                    >
                      Answer now
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {earlier.length > 0 ? (
            <section aria-labelledby="earlier-today" className="mt-14">
              <h2 id="earlier-today" className="font-display text-display-s">
                {past ? "Written earlier" : "Earlier today"}
              </h2>
              <p className="mt-1.5 max-w-[34rem] text-[0.9375rem] text-ink/70">
                What you wrote on the page you used before switching. It stays with this day’s page.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-4">
                {earlier.map((f) => (
                  <li key={f.fieldId} className="card p-5 sm:p-6">
                    <p className="font-semibold">{f.label}</p>
                    <div className="mt-2">
                      <FieldRenderer field={{ id: f.fieldId, type: f.type, label: f.label, required: false, order: 0, config: {} }} value={f.value} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {asks.length > 0 ? (
            <section aria-labelledby="kata-asks" className="mt-14">
              <div className="flex items-center gap-3">
                <KataMark size={40} cut="ground" />
                <h2 id="kata-asks" className="font-display text-display-s">
                  {name} also asks
                </h2>
              </div>
              <p className="bubble-kata mt-4 w-fit max-w-[34rem] px-4 py-3 text-[0.9375rem] leading-snug">
                {NUMBER_WORDS[asks.length] ?? asks.length} {asks.length === 1 ? "question" : "questions"} from me{past ? " about yesterday" : " today"}.
                Answer any you like: each answer files the page under its tag.
              </p>
              <ul className="mt-8 grid grid-cols-1 gap-6">
                {asks.map((a, i) => (
                  <AskCard
                    key={a.fieldId}
                    ask={{ ...a, text: say(a.text) }}
                    index={i}
                    value={(values[a.fieldId] as string) ?? ""}
                    onChange={(v) => setValue(a.fieldId, v)}
                    open={openAsks.has(a.fieldId)}
                    onOpenChange={(o) => setAskOpen(a.fieldId, o)}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="max-xl:hidden">
          <div className="sticky top-8">
            <PageOutline fields={outlineFields} asks={outlineAsks} words={wordCount} onJump={jumpTo} />
          </div>
        </aside>

        <AnimatePresence>
          {sealed ? (
            <motion.div
              key="seal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
              className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-ground/70 backdrop-blur-[2px] lg:left-[16.5rem]"
            >
              <motion.span
                initial={reduce ? false : { opacity: 0, scale: 1.9, rotate: -32 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="grid justify-items-center gap-4"
              >
                <Seal size={132} cut="ground" title="Sealed" />
                <span className="font-display text-display-s">Page {pageNumber.toLocaleString("en-US")}, sealed</span>
              </motion.span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 lg:left-[16.5rem]">
          <div className={`${COLUMNS} pb-[max(0.75rem,env(safe-area-inset-bottom))]`}>
            <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-full border-2 border-edge bg-surface py-1.5 pl-5 pr-1.5 shadow-sticker">
              <p className="min-w-0 text-[0.875rem] leading-tight text-ink/70 sm:flex sm:items-baseline sm:gap-2">
                <span className="block whitespace-nowrap">
                  <span className="font-display text-[1.3rem] tabular-nums text-ink">{wordCount.toLocaleString("en-US")}</span>{" "}
                  {wordCount === 1 ? "word" : "words"}
                </span>
                <span aria-hidden className="text-ink/35 max-sm:hidden">
                  ·
                </span>
                <span aria-live="polite" className={`block truncate ${dirty ? "font-semibold text-ink" : ""}`}>
                  {status}
                </span>
              </p>
              <Button size="lg" onClick={() => doSave({ redirectAfter: true })} disabled={saving || sealed} className="shrink-0">
                {sealed ? "Sealed" : saving ? "Saving…" : "Save & close"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TagHues>
  );
}
