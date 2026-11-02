"use client";

import { createContext, useContext } from "react";
import { DEFAULT_COMPANION } from "@/lib/companion/name";
import type { Names } from "@/lib/companion/naming";
import type { ReplyT } from "@/lib/types";

const CompanionContext = createContext<Names>({ name: DEFAULT_COMPANION, nickname: "", hue: null });

/** Set once by AppShell from the writer's settings; a refresh after renaming carries the new name. */
export function CompanionProvider({ names, children }: { names: Names; children: React.ReactNode }) {
  return <CompanionContext.Provider value={names}>{children}</CompanionContext.Provider>;
}

/** The companion's name, and what it calls the writer, as they chose them. */
export function useCompanion(): Names {
  return useContext(CompanionContext);
}

/** A post someone asked the companion about. */
export interface Focus {
  id: string;
  /** "Mira's post" */
  label: string;
  text: string;
}

/** Sent by a post's "Ask Maru" button; the conversation on screen (home, or the panel) takes it up. */
export const ASK_EVENT = "maru:ask";

export function askAbout(focus: Focus) {
  window.dispatchEvent(new CustomEvent<Focus>(ASK_EVENT, { detail: focus }));
}

/** Maru said hi as they came back: the conversation on screen shows it. */
export const HELLO_EVENT = "maru:hello";

const HELLO_KEY = "kata-hello";
const HELLO_GAP = 30 * 60_000;

/** Whether they've been away long enough for a hello, here on this device. Asking counts as seeing them. */
export function helloDue(): boolean {
  try {
    const last = Number(localStorage.getItem(HELLO_KEY) ?? 0);
    if (Date.now() - last < HELLO_GAP) return false;
    localStorage.setItem(HELLO_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the server still won't greet anyone it's just spoken to.
  }
  return true;
}

/** The companion posted a reply: the post on screen shows it at once. */
export const REPLIED_EVENT = "maru:replied";

export interface Replied {
  momentId: string;
  reply: ReplyT;
  /** The post's reply count after it, when known. */
  count: number | null;
}
