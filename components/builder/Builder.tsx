"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "framer-motion";
import type { FieldType, Template, TemplateField } from "@/lib/types";
import { FieldPalette } from "./FieldPalette";
import { FieldCard } from "./FieldCard";
import { FIELD_TYPE_META } from "./fieldTypes";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/Toast";
import { FieldRenderer } from "@/components/entry/FieldRenderer";

interface BuilderProps {
  initial: Template;
  redirectAfterSave?: string;
}

export function Builder({ initial, redirectAfterSave }: BuilderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  useEffect(() => {
    setTemplate(initial);
    setDirty(false);
  }, [initial]);

  const update = useCallback(
    (patch: Partial<Template>) => {
      setTemplate((prev) => ({ ...prev, ...patch }));
      setDirty(true);
    },
    []
  );

  function addField(type: FieldType) {
    const meta = FIELD_TYPE_META[type];
    const newField: TemplateField = {
      id: nanoid(8),
      type,
      label: meta.defaultLabel,
      required: false,
      order: template.fields.length,
      config: {},
    };
    update({ fields: [...template.fields, newField] });
  }

  function changeField(id: string, next: TemplateField) {
    update({
      fields: template.fields.map((f) => (f.id === id ? next : f)),
    });
  }

  function removeField(id: string) {
    update({ fields: template.fields.filter((f) => f.id !== id) });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = template.fields.findIndex((f) => f.id === active.id);
    const newIdx = template.fields.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(template.fields, oldIdx, newIdx).map((f, i) => ({
      ...f,
      order: i,
    }));
    update({ fields: reordered });
  }

  async function save() {
    if (saving || template.fields.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: template._id,
          name: template.name,
          description: template.description,
          tags: template.tags,
          fields: template.fields.map((f, i) => ({ ...f, order: i })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      const data = await res.json();
      setTemplate((t) => ({ ...t, _id: data.template?._id }));
      setDirty(false);
      toast("Template saved", "success");
      if (redirectAfterSave) {
        setTimeout(() => router.push(redirectAfterSave), 400);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast(msg, "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <input
            value={template.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Template name"
            className="bg-transparent border-0 px-0 py-0 text-2xl font-semibold focus:ring-0 focus:shadow-none focus:outline-none w-full focus-visible:!shadow-none"
          />
          <input
            value={template.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="A short description of this template"
            className="bg-transparent border-0 px-0 py-0 text-sm text-text-secondary mt-1 w-full focus:ring-0 focus:shadow-none focus:outline-none focus-visible:!shadow-none"
          />
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-warning font-mono">
              ● Unsaved changes
            </span>
          )}
          <Button
            variant="secondary"
            onClick={() => setPreviewing((p) => !p)}
          >
            {previewing ? "Edit" : "Preview"}
          </Button>
          <Button onClick={save} disabled={saving || template.fields.length === 0}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {previewing ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="max-w-[680px] mx-auto"
          >
            <div className="text-xs uppercase tracking-widest text-text-muted font-mono mb-3">
              Preview — this is what you&apos;ll see daily
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-6">
              {template.fields.map((field, idx) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: 0.06 * idx }}
                  className="space-y-2"
                >
                  {field.type !== "divider" && (
                    <label className="block text-sm font-medium text-text-secondary">
                      {field.label}
                      {field.required && (
                        <span className="text-text-muted ml-1.5">*</span>
                      )}
                    </label>
                  )}
                  <FieldRenderer
                    field={field}
                    value={field.type === "tags" ? [] : ""}
                    onChange={() => {}}
                    readOnly
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="grid lg:grid-cols-[280px_1fr] gap-6"
          >
            <FieldPalette onAdd={addField} />
            <div>
              <div className="text-xs uppercase tracking-widest text-text-muted font-mono mb-3">
                Form canvas
              </div>
              {template.fields.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-bg-surface/50 p-12 text-center text-text-muted">
                  Add fields from the palette to get started.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={template.fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2.5">
                      {template.fields.map((field) => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          onChange={(next) => changeField(field.id, next)}
                          onRemove={() => removeField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              <p className="text-xs text-text-muted mt-3 text-center">
                Click a field to configure · drag handle to reorder · hold ✕ to delete
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
