"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/Icon";
import type { TemplateField } from "@/lib/types";
import { FIELD_TYPE_META } from "./fieldTypes";
import { FieldConfig } from "./FieldConfig";

/** One field of the page, as a sticker you can pick up (handle), open (config) and peel off (two presses). */
export function FieldCard({
  field,
  open,
  folded = false,
  error,
  fresh,
  onToggle,
  onChange,
  onRemove,
  onPickUp,
  onRelease,
}: {
  field: TemplateField;
  /** Expanded to show its settings. */
  open: boolean;
  /** Folded at once, no animation: a field is being carried and the list must measure true. */
  folded?: boolean;
  error?: string;
  /** Just added: arrives with a small appear. */
  fresh?: boolean;
  onToggle: () => void;
  onChange: (next: TemplateField) => void;
  onRemove: () => void;
  /** The handle was grabbed: fold open fields before the drag measures the list. */
  onPickUp: () => void;
  /** The handle was let go without a drag starting. */
  onRelease: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const reduce = useReducedMotion();
  // Deleting takes two presses: the first arms it, the second confirms. Works for touch and keys.
  const [armed, setArmed] = useState(false);
  const meta = FIELD_TYPE_META[field.type];
  const isDivider = field.type === "divider";
  const title = isDivider ? (field.config?.sectionLabel as string) || "Section break" : field.label.trim() || "Untitled question";

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const style = {
    // Picked up, a sticker tilts a little and casts a longer shadow.
    transform: [CSS.Transform.toString(transform), isDragging ? "rotate(-1.2deg)" : ""].filter(Boolean).join(" ") || undefined,
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-hue={meta.hue ?? undefined}
      className={`relative rounded-lg border-2 bg-surface transition-shadow duration-300 ${fresh ? "appear" : ""} ${
        error ? "border-bad shadow-[3px_3px_0_var(--bad)]" : "border-edge"
      } ${isDragging ? "shadow-sticker" : error ? "" : "shadow-sticker-sm"}`}
    >
      <div className="flex items-center gap-1 p-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onPointerDown={(e) => {
            onPickUp();
            listeners?.onPointerDown?.(e);
          }}
          onPointerUp={onRelease}
          onKeyDown={(e) => {
            if (!isDragging && (e.code === "Space" || e.code === "Enter")) onPickUp();
            listeners?.onKeyDown?.(e);
          }}
          className="grid h-11 w-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-ink/55 transition-colors hover:bg-ink/[0.06] hover:text-ink active:cursor-grabbing"
          aria-label={`Move ${title}`}
        >
          <Icon name="drag" strokeWidth={2.8} className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-1 text-left xs:gap-3"
        >
          <span
            aria-hidden
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-edge xs:h-9 xs:w-9 ${
              isDivider ? "bg-raised text-ink" : "bg-hue text-on-hue"
            }`}
          >
            <Icon name={meta.icon} className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`line-clamp-2 text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere] ${field.label.trim() || isDivider ? "" : "text-ink/65"}`}>
              {title}
              {field.required ? (
                <span className="ml-1 align-top text-xs text-accent" aria-hidden>
                  ●
                </span>
              ) : null}
            </span>
            <span className="block truncate text-sm text-ink/65">
              {meta.label}
              {field.required ? " · Required" : ""}
              {error ? <span className="font-semibold text-bad"> · {error}</span> : null}
            </span>
          </span>
          <Icon
            name="arrow-down"
            className={`h-4 w-4 shrink-0 text-ink/55 transition-transform duration-300 max-xs:hidden ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          onClick={() => (armed ? onRemove() : setArmed(true))}
          aria-label={armed ? `Confirm removing ${title}` : `Remove ${title}`}
          className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors duration-300 ${
            armed
              ? "border-2 border-edge bg-bad px-3 text-surface"
              : "w-11 text-ink/55 hover:bg-ink/[0.06] hover:text-bad"
          }`}
        >
          <Icon name="trash" className="h-[1.1rem] w-[1.1rem]" />
          {armed ? <span>Remove?</span> : null}
        </button>
      </div>
      {folded ? null : (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-clip"
            >
              <div className="well mx-1.5 mb-1.5 p-4 sm:p-5">
                <FieldConfig field={field} onChange={onChange} error={error} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </li>
  );
}
