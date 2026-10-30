"use client";

import { useSyncExternalStore } from "react";

// The owner's verdict on each prototype, kept in this browser only.
export type Verdict = "keep" | "maybe" | "drop";
const KEY = "kata-lab-verdicts";
const listeners = new Set<() => void>();
let cache: Record<string, Verdict> | null = null;

function read(): Record<string, Verdict> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    cache = {};
  }
  return cache!;
}

export function setVerdict(slug: string, v: Verdict | null) {
  const next = { ...read() };
  if (v) next[slug] = v;
  else delete next[slug];
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the choice lasts for this page view.
  }
  listeners.forEach((l) => l());
}

const EMPTY: Record<string, Verdict> = {};

export function useVerdicts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY
  );
}
