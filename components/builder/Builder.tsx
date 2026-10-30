"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { nanoid } from "nanoid";
import type { FieldType, Template, TemplateField } from "@/lib/types";
import { FormPreview } from "@/components/entry/FormPreview";
import { EmptyNote } from "@/components/shared/AppPage";
import { MaruMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import { AskKata } from "./AskKata";
import { FieldCard } from "./FieldCard";
import { questionInputId } from "./FieldConfig";
import { FieldPalette } from "./FieldPalette";
import { FIELD_TYPE_META, MAX_FIELDS } from "./fieldTypes";

interface BuilderProps {
  initial: Template;
  redirectAfterSave?: string;
}

interface Problems {
  name?: string;
  empty?: string;
  fields: Record<string, string>;
}

/** What has to be true before the API will take the page (lib/validation/schemas.ts). */
function check(t: Template): Problems {
  const p: Problems = { fields: {} };
  if (!t.name.trim()) p.name = "Give your page a name.";
  if (!t.fields.some((f) => f.type !== "divider")) p.empty = "Add at least one question before saving.";
  for (const f of t.fields) if (f.type !== "divider" && !f.label.trim()) p.fields[f.id] = "Write the question";
  return p;
}

const DRAG_HELP =
  "To move a field, press Space or Enter. Use the up and down arrow keys to move it, Space or Enter to drop it, or Escape to cancel.";

// The live preview sits beside the list from 80rem; below that, Preview swaps it in.
const WIDE = "(min-width: 80rem)";
function subscribeWide(onChange: () => void) {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
function useWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

export function Builder({ initial, redirectAfterSave }: BuilderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { name: companionName } = useCompanion();
  const wide = useWide();
  const [template, setTemplate] = useState<Template>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [asking, setAsking] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  // While a field is carried every field is folded, so the list's measurements stay true.
  const [carrying, setCarrying] = useState(false);
  const dragging = useRef(false);
  const [seenInitial, setSeenInitial] = useState(initial);
  // An input to focus once it has rendered (a field just added, or the first problem).
  const pendingFocus = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Reset local state when the parent loads a different template.
  // This is the React-recommended alternative to setState-in-effect for prop-driven resets.
  if (seenInitial !== initial) {
    setSeenInitial(initial);
    setTemplate(initial);
    setDirty(false);
    setShowProblems(false);
  }

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    pendingFocus.current = null;
    el.focus();
    el.select();
  });

  // Leaving with unsaved changes asks first (reloads and closing the tab).
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const problems = check(template);
  const shown = showProblems ? problems : { fields: {} as Record<string, string> };
  const full = template.fields.length >= MAX_FIELDS;
  const questions = template.fields.filter((f) => f.type !== "divider").length;

  const update = useCallback((patch: Partial<Template>) => {
    setTemplate((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  function toggleOpen(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addField(type: FieldType) {
    if (template.fields.length >= MAX_FIELDS) return;
    const meta = FIELD_TYPE_META[type];
    const field: TemplateField = {
      id: nanoid(8),
      type,
      label: meta.defaultLabel,
      required: false,
      order: template.fields.length,
      config: {},
    };
    update({ fields: [...template.fields, field] });
    setOpen((prev) => new Set(prev).add(field.id));
    setFresh(new Set([field.id]));
    setPreviewing(false);
    // Straight into writing the question: its default text is selected, so typing replaces it.
    pendingFocus.current = questionInputId(field);
  }

  function addFromKata(fields: TemplateField[]) {
    const room = MAX_FIELDS - template.fields.length;
    const added = fields.slice(0, room).map((f, i) => ({ ...f, order: template.fields.length + i }));
    if (!added.length) return;
    update({ fields: [...template.fields, ...added] });
    setFresh(new Set(added.map((f) => f.id)));
  }

  function changeField(id: string, next: TemplateField) {
    update({ fields: template.fields.map((f) => (f.id === id ? next : f)) });
  }

  function removeField(id: string) {
    update({ fields: template.fields.filter((f) => f.id !== id) });
    setOpen((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // Fold synchronously, before the drag measures the list (open fields are much taller).
  function pickUp() {
    if (open.size && !carrying) flushSync(() => setCarrying(true));
  }

  function release() {
    if (!dragging.current) setCarrying(false);
  }

  function onDragEnd(event: DragEndEvent) {
    dragging.current = false;
    setCarrying(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = template.fields.findIndex((f) => f.id === active.id);
    const newIdx = template.fields.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(template.fields, oldIdx, newIdx).map((f, i) => ({ ...f, order: i }));
    update({ fields: reordered });
  }

  // What a screen reader hears while a field is carried: its question and where it would land.
  const titleOf = (id: UniqueIdentifier | undefined) => {
    const f = template.fields.find((x) => x.id === id);
    if (!f) return "the field";
    return f.type === "divider" ? (f.config?.sectionLabel as string) || "Section break" : f.label.trim() || "Untitled question";
  };
  const placeOf = (id: UniqueIdentifier | undefined) =>
    `${template.fields.findIndex((x) => x.id === id) + 1} of ${template.fields.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}. It is at position ${placeOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over position ${placeOf(over.id)}.` : `${titleOf(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} dropped at position ${placeOf(over.id)}.` : `${titleOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving cancelled. ${titleOf(active.id)} is back where it was.`,
  };

  async function save() {
    if (saving || !dirty) return;
    const bad = Object.keys(problems.fields);
    if (problems.name || problems.empty || bad.length) {
      setShowProblems(true);
      setPreviewing(false);
      if (bad.length) setOpen((prev) => new Set([...prev, ...bad]));
      pendingFocus.current = problems.name ? "tpl-name" : bad.length ? questionInputId({ id: bad[0] }) : null;
      const n = (problems.name ? 1 : 0) + bad.length;
      toast(problems.empty ?? (n === 1 ? "One thing to fix before saving" : `${n} things to fix before saving`), "danger");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: template._id,
          name: template.name.trim(),
          description: template.description,
          tags: template.tags,
          fields: template.fields.map((f, i) => ({ ...f, label: f.label.trim() || FIELD_TYPE_META[f.type].defaultLabel, order: i })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { _id?: string; error?: string };
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Your session ended. Sign in again to save."
            : res.status === 400
              ? "Kata couldn’t save that page. Check the name and the questions."
              : "Save failed. Try again."
        );
      }
      // The API answers with the saved page's id; a brand-new page keeps it for the next save.
      setTemplate((t) => ({ ...t, _id: data._id ?? t._id }));
      setDirty(false);
      setShowProblems(false);
      toast("Daily page saved", "success");
      if (redirectAfterSave) setTimeout(() => router.push(redirectAfterSave), 400);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed. Try again.", "danger");
    } finally {
      setSaving(false);
    }
  }

  // Cmd/Ctrl+S saves.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const preview = (
    <div className="card overflow-clip">
      <div className="rule flex items-center justify-between gap-3 border-b-2 px-5 py-3.5">
        <p className="inline-flex items-center gap-2 text-sm font-semibold">
          <Icon name="eye" className="h-4 w-4" />
          Preview
        </p>
        <p className="text-sm text-ink/65">Try writing in it. Nothing is saved.</p>
      </div>
      <div className="px-5 pb-7 pt-5 sm:px-7">
        <p className="font-display text-display-s">{template.name.trim() || "Untitled page"}</p>
        <div className="mt-7">
          {template.fields.length ? (
            <FormPreview fields={template.fields} />
          ) : (
            <p className="text-ink/65">Questions you add show up here.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[72rem] px-margin pb-36 pt-[clamp(1.75rem,4.5vw,3.75rem)]">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <p className="text-[0.9375rem] font-medium text-ink/70">Your daily page</p>
          <div className="flex flex-wrap items-center gap-x-5">
            <Link href="/templates#your-pages" className="link inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-ink/75">
              All your pages
            </Link>
            <Link href="/templates" className="link inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-ink/75">
              Find one in the gallery
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <label htmlFor="tpl-name" className="sr-only">
          Page name
        </label>
        <AutoGrow
          id="tpl-name"
          value={template.name}
          onValue={(name) => update({ name })}
          singleLine
          placeholder="Name this page"
          maxLength={80}
          aria-invalid={Boolean(shown.name)}
          aria-describedby={shown.name ? "tpl-name-err" : undefined}
          className={`mt-1 min-h-14 rounded-md bg-transparent py-1 font-display text-display-m leading-[1.05] placeholder:text-ink/40 focus-visible:outline-offset-4 ${
            shown.name ? "outline-2 outline-offset-4 outline-bad" : ""
          }`}
        />
        {shown.name ? (
          <p id="tpl-name-err" role="alert" className="mt-2 text-sm font-medium text-bad">
            {shown.name}
          </p>
        ) : null}
        <label htmlFor="tpl-desc" className="sr-only">
          Description
        </label>
        <AutoGrow
          id="tpl-desc"
          value={template.description}
          onValue={(description) => update({ description })}
          singleLine
          placeholder="What this page is for. Shown in the gallery if you publish it."
          maxLength={500}
          className="mt-2 min-h-11 rounded-md bg-transparent py-2 text-lede text-ink/75 placeholder:text-ink/50"
        />
      </header>

      <div className="mt-9 grid grid-cols-1 gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="min-w-0">
          {previewing && !wide ? (
            <div className="mx-auto max-w-[44rem]">{preview}</div>
          ) : (
            <>
              <section aria-labelledby="add-title">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <h2 id="add-title" className="font-display text-display-s">
                    Add a question
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAsking((a) => !a)}
                    aria-expanded={asking}
                    aria-controls="ask-kata"
                    className={`chip max-w-full pl-2 ${asking ? "bg-sun text-on-sun" : ""}`}
                  >
                    <MaruMark size={26} />
                    <span className="min-w-0 truncate">Ask {companionName} for questions</span>
                  </button>
                </div>
                <div className="mt-4">
                  <FieldPalette onAdd={addField} full={full} />
                </div>
                {full ? (
                  <p className="mt-2 text-sm text-ink/70">A page holds up to {MAX_FIELDS} fields. Remove one to add another.</p>
                ) : null}
                {asking ? (
                  <div className="mt-5">
                    <AskKata
                      id="ask-kata"
                      existing={template.fields}
                      room={MAX_FIELDS - template.fields.length}
                      onAdd={addFromKata}
                      onClose={() => setAsking(false)}
                    />
                  </div>
                ) : null}
              </section>

              <section aria-labelledby="list-title" className="mt-10">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id="list-title" className="font-display text-display-s">
                    On your page
                  </h2>
                  <p className="shrink-0 text-sm tabular-nums text-ink/65">
                    {questions} {questions === 1 ? "question" : "questions"}
                  </p>
                </div>
                {template.fields.length === 0 ? (
                  <div className="mt-4">
                    <EmptyNote
                      action={
                        <Button variant="secondary" className="max-w-full" onClick={() => setAsking(true)}>
                          <MaruMark size={24} />
                          <span className="min-w-0 truncate">Ask {companionName} for questions</span>
                        </Button>
                      }
                    >
                      {showProblems && problems.empty ? (
                        <span className="font-medium text-bad">{problems.empty}</span>
                      ) : (
                        `Your page is empty. Add a question above, or ask ${companionName} for a few.`
                      )}
                    </EmptyNote>
                  </div>
                ) : (
                  <DndContext
                    // A fixed id keeps dnd-kit's generated aria ids the same on the server and the client.
                    id="page-fields"
                    // Re-measure while carrying: an open field folds away when it's picked up.
                    measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={() => {
                      dragging.current = true;
                    }}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => {
                      dragging.current = false;
                      setCarrying(false);
                    }}
                    accessibility={{ announcements, screenReaderInstructions: { draggable: DRAG_HELP } }}
                  >
                    <SortableContext items={template.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                      <ol className="mt-4 space-y-3">
                        {template.fields.map((field) => (
                          <FieldCard
                            key={field.id}
                            field={field}
                            open={open.has(field.id)}
                            folded={carrying}
                            error={shown.fields[field.id]}
                            fresh={fresh.has(field.id)}
                            onToggle={() => toggleOpen(field.id)}
                            onChange={(next) => changeField(field.id, next)}
                            onRemove={() => removeField(field.id)}
                            onPickUp={pickUp}
                            onRelease={release}
                          />
                        ))}
                      </ol>
                    </SortableContext>
                  </DndContext>
                )}
                {template.fields.length > 1 ? (
                  <p className="mt-4 text-sm text-ink/65">
                    Open a field to edit it. Drag the handle to reorder, or focus it, press Space and use the arrow keys.
                  </p>
                ) : null}
              </section>
            </>
          )}
        </div>

        {/* Reserved by CSS at 80rem so nothing shifts; filled once the browser says it's that wide. */}
        <aside aria-label="Preview of your page" className="hidden xl:block">
          <div className="sticky top-6 max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain rounded-lg pb-2 pr-2">
            {wide ? preview : null}
          </div>
        </aside>
      </div>

      <div className="rule fixed inset-x-0 bottom-0 z-30 border-t-2 bg-ground/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:left-[16.5rem]">
        <div className="mx-auto flex h-[4.5rem] max-w-[72rem] items-center justify-between gap-3 px-margin">
          <p className="flex min-w-0 items-center gap-2 text-sm font-medium" aria-live="polite">
            {dirty ? (
              <>
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-edge bg-sun" />
                <span className="truncate">
                  Unsaved<span className="max-xs:hidden"> changes</span>
                </span>
              </>
            ) : (
              <>
                <Icon name="check" className="h-4 w-4 shrink-0 text-ok" strokeWidth={2.4} />
                <span className="truncate text-ink/70">
                  <span className="max-xs:hidden">All changes saved</span>
                  <span className="xs:hidden">Saved</span>
                </span>
              </>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {!wide ? (
              <Button variant="secondary" onClick={() => setPreviewing((p) => !p)} aria-pressed={previewing}>
                <Icon name={previewing ? "pen" : "eye"} className="h-4 w-4" />
                {previewing ? "Edit" : "Preview"}
              </Button>
            ) : null}
            <Button onClick={save} disabled={saving || !dirty} aria-keyshortcuts="Control+S Meta+S">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A text box that grows with what's in it, so long names and descriptions wrap instead of hiding. */
function AutoGrow({
  value,
  onValue,
  singleLine = false,
  className = "",
  ...rest
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string;
  onValue: (v: string) => void;
  /** One logical line: Enter does nothing and pasted line breaks become spaces. */
  singleLine?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Re-measure when the width changes (rotating a phone, opening the rail).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onValue(singleLine ? e.target.value.replace(/[\r\n]+/g, " ") : e.target.value)}
      onKeyDown={(e) => {
        if (singleLine && e.key === "Enter") e.preventDefault();
      }}
      className={`block w-full resize-none overflow-hidden ${className}`}
      {...rest}
    />
  );
}
