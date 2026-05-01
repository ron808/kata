"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import type { TemplateField } from "@/lib/types";
import { FIELD_TYPE_META } from "./fieldTypes";
import { FieldConfig } from "./FieldConfig";

export function FieldCard({
  field,
  onChange,
  onRemove,
}: {
  field: TemplateField;
  onChange: (next: TemplateField) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });
  const [open, setOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const meta = FIELD_TYPE_META[field.type];

  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  function startHold() {
    setHoldProgress(0);
    const start = Date.now();
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 400);
      setHoldProgress(p);
      if (p >= 1) {
        if (holdTimer.current) clearInterval(holdTimer.current);
        holdTimer.current = null;
        onRemove();
      }
    }, 16);
  }
  function endHold() {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldProgress(0);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
    boxShadow: isDragging ? "0 12px 32px -8px rgba(0,0,0,0.6)" : undefined,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={`rounded-xl border bg-bg-surface transition-colors ${
        open ? "border-accent" : "border-border hover:border-border-strong"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary p-1"
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </button>
        <span className="grid place-items-center w-8 h-8 rounded-md bg-bg-elevated text-accent font-mono text-sm shrink-0">
          {meta.icon}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 min-w-0 text-left"
        >
          <span className="block text-sm text-text-primary truncate">
            {field.label}
            {field.required && <span className="text-text-muted ml-1">*</span>}
          </span>
          <span className="block text-xs text-text-muted">{meta.label}</span>
        </button>
        <button
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          className="relative grid place-items-center w-8 h-8 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors overflow-hidden"
          aria-label="Hold to delete"
          title="Hold to delete"
        >
          ✕
          {holdProgress > 0 && (
            <span
              className="absolute inset-0 bg-danger/30 origin-bottom"
              style={{ transform: `scaleY(${holdProgress})` }}
            />
          )}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4">
              <FieldConfig field={field} onChange={onChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
