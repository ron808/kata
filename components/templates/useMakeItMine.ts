"use client";

import { useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { TemplateField } from "@/lib/types";
import { isQuestion, tidy, type GalleryPage } from "./data";

export type Then = "write" | "builder";

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Your session ended. Sign in again, then try once more."
        : res.status === 404
          ? "That page isn’t in the gallery any more."
          : res.status === 400
            ? "Kata couldn’t save that page. Check the name and questions."
            : "Something went wrong. Try again."
    );
  }
  return data;
}

/**
 * Keep or drop each question, rename the page, then make it yours: a published
 * page is cloned (so its author sees one more use) and your edits are applied
 * to the copy; a starter or a draft becomes a new page. Either way it becomes
 * your daily page.
 */
export function useMakeItMine(
  page: GalleryPage,
  { description, onDone }: { description?: string; onDone: (name: string, then: Then) => void }
) {
  const [name, setName] = useState(page.saveName);
  const [dropped, setDropped] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState<Then | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // A clone that worked while the edit after it didn't: retrying only re-applies the edit.
  const cloneId = useRef<string | null>(null);

  const questions = useMemo(() => page.fields.filter(isQuestion), [page.fields]);
  const kept = useMemo(() => tidy(page.fields.filter((f) => !dropped.has(f.id))), [page.fields, dropped]);
  const keptCount = kept.filter(isQuestion).length;
  const trimmed = name.trim();
  const nameError = trimmed ? null : "Give your page a name.";
  const blocked = nameError ?? (keptCount === 0 ? "Keep at least one question." : null);

  function toggle(id: string) {
    setDropped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  async function adopt(then: Then) {
    if (busy || blocked) return;
    setBusy(then);
    setError(null);
    try {
      const desc = (description ?? page.description).slice(0, 500);
      const tags = page.tags.slice(0, 8);
      if (page.source === "people" && page.templateId) {
        if (!cloneId.current) {
          const { _id } = await post<{ _id: string }>(`/api/templates/${page.templateId}/clone`);
          cloneId.current = _id;
        }
        const edited = trimmed !== page.name || kept.length !== page.fields.length;
        if (edited) {
          await post("/api/templates", { _id: cloneId.current, name: trimmed, description: desc, tags, fields: kept });
        }
      } else {
        // Fresh ids: a starter's are only stable for this screen.
        const fields: TemplateField[] = kept.map((f, i) => ({ ...f, id: nanoid(8), order: i, config: { ...(f.config ?? {}) } }));
        await post("/api/templates", { name: trimmed, description: desc, tags, fields });
      }
      setDone(true);
      onDone(trimmed, then);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return {
    name,
    setName,
    nameError,
    dropped,
    toggle,
    questions,
    kept,
    keptCount,
    blocked,
    busy,
    error,
    done,
    adopt,
  };
}

export type MakeItMine = ReturnType<typeof useMakeItMine>;
