"use client";

import { useReducer } from "react";
import type { ReactionKind, ThreadStatus } from "@/lib/types";
import { ALL_THREADS, ITEMS, ME, SCRIPTS, SPACES, THEIR_OWN, scriptFor, withStep, type DemoThread, type Incoming, type Item, type Space } from "./data";

/*
 * Spaces as the board and the room both keep them, in this browser only: who's in each, which
 * threads are in it, and what's happened there. What would be the server's rules are here too:
 * only the maker removes people, a removed person's threads come out with them, and leaving
 * takes your threads out while what you said stays.
 */

export interface SpacesState {
  spaces: Space[];
  threads: Record<string, DemoThread>;
  items: Item[];
  n: number;
  scripts: Record<string, Incoming[]>;
  played: Record<string, number>;
  /** The space just left, to say what happened to it. */
  left: { name: string; mine: string[] } | null;
}

export type SpacesAction =
  | { type: "make"; id: string; name: string; members: string[] }
  | { type: "add"; space: string; thread: string }
  | { type: "out"; space: string; thread: string }
  | { type: "post"; thread: string; text: string; status: ThreadStatus | null }
  | { type: "say"; space: string; text: string }
  | { type: "cheer"; item: string; kind: ReactionKind }
  | { type: "remove"; space: string; person: string }
  | { type: "invite"; space: string; people: string[] }
  | { type: "leave"; space: string }
  | { type: "play"; space: string; kinds: Incoming["kind"][] };

export function initialSpaces(): SpacesState {
  return {
    spaces: SPACES.map((s) => ({ ...s, members: [...s.members], threads: [...s.threads], pins: [...s.pins] })),
    threads: Object.fromEntries(ALL_THREADS.map((t) => [t.id, { ...t }])),
    items: ITEMS.map((i) => ({ ...i })),
    n: 0,
    scripts: { ...SCRIPTS },
    played: {},
    left: null,
  };
}

/** The next thing someone else does in a space, if there's anything left that still makes sense. */
export function nextIn(state: SpacesState, spaceId: string, kinds: Incoming["kind"][]): { at: number; event: Incoming } | null {
  const space = state.spaces.find((s) => s.id === spaceId);
  if (!space) return null;
  const script = state.scripts[spaceId] ?? [];
  for (let at = state.played[spaceId] ?? 0; at < script.length; at++) {
    const e = script[at];
    if (!kinds.includes(e.kind) || !space.members.includes(e.by)) continue;
    if (e.kind === "update" && !space.threads.includes(e.thread)) continue;
    if (e.kind === "add" && space.threads.includes(e.thread)) continue;
    return { at, event: e };
  }
  return null;
}

const front = (ids: string[], id: string) => [id, ...ids.filter((x) => x !== id)];

function reduce(state: SpacesState, action: SpacesAction): SpacesState {
  const n = state.n + 1;
  const id = `x${n}`;
  const note = (space: string, by: string, what: Extract<Item, { kind: "note" }>["what"], more: { thread?: string; person?: string } = {}): Item => ({ id, space, kind: "note", by, what, ago: 0, ...more });
  const mapSpace = (spaceId: string, f: (s: Space) => Space) => state.spaces.map((s) => (s.id === spaceId ? f(s) : s));

  switch (action.type) {
    case "make": {
      const used = new Set(state.spaces.map((s) => s.hue));
      const hue = [7, 4, 1, 5, 0, 2, 3, 6].find((h) => !used.has(h)) ?? n % 8;
      const space: Space = { id: action.id, name: action.name, hue, maker: ME, members: [ME, ...action.members], threads: [], pins: [] };
      return {
        ...state,
        n,
        spaces: [space, ...state.spaces],
        items: [...state.items, note(space.id, ME, "made")],
        scripts: { ...state.scripts, [space.id]: scriptFor(action.members) },
        left: null,
      };
    }
    case "add":
      return { ...state, n, spaces: mapSpace(action.space, (s) => ({ ...s, threads: front(s.threads, action.thread), pins: [...s.pins.filter((t) => t !== action.thread), action.thread] })), items: [...state.items, note(action.space, ME, "added", { thread: action.thread })], left: null };
    case "out":
      return { ...state, n, spaces: mapSpace(action.space, (s) => ({ ...s, threads: s.threads.filter((t) => t !== action.thread), pins: s.pins.filter((t) => t !== action.thread) })), items: [...state.items, note(action.space, ME, "out", { thread: action.thread })], left: null };
    case "post": {
      const t = state.threads[action.thread];
      if (!t) return state;
      // Posted once, it shows in every space the thread is in.
      const where = state.spaces.filter((s) => s.threads.includes(t.id));
      const items: Item[] = where.map((s, i) => ({ id: `${id}-${i}`, space: s.id, kind: "update", by: t.owner, thread: t.id, text: action.text, status: action.status, ago: 0, cheers: {} }));
      return {
        ...state,
        n,
        threads: action.status ? { ...state.threads, [t.id]: withStep(t, action.status) } : state.threads,
        spaces: state.spaces.map((s) => (s.threads.includes(t.id) ? { ...s, threads: front(s.threads, t.id) } : s)),
        items: [...state.items, ...items],
        left: null,
      };
    }
    case "say":
      return { ...state, n, items: [...state.items, { id, space: action.space, kind: "say", by: ME, text: action.text, ago: 0 }], left: null };
    case "cheer":
      return {
        ...state,
        items: state.items.map((i) => {
          if (i.id !== action.item || i.kind !== "update") return i;
          const who = i.cheers[action.kind] ?? [];
          return { ...i, cheers: { ...i.cheers, [action.kind]: who.includes(ME) ? who.filter((w) => w !== ME) : [...who, ME] } };
        }),
      };
    case "remove":
      return {
        ...state,
        n,
        // Their threads come out with them; what they said stays, as in any group conversation.
        spaces: mapSpace(action.space, (s) => ({ ...s, members: s.members.filter((m) => m !== action.person), threads: s.threads.filter((t) => state.threads[t]?.owner !== action.person), pins: s.pins.filter((t) => state.threads[t]?.owner !== action.person) })),
        items: [...state.items, note(action.space, ME, "removed", { person: action.person })],
        left: null,
      };
    case "invite": {
      const extra: Incoming[] = action.people.filter((p) => THEIR_OWN[p]).map((p) => ({ by: p, kind: "add", thread: THEIR_OWN[p].thread.id, text: THEIR_OWN[p].line }));
      return {
        ...state,
        n: n + action.people.length,
        spaces: mapSpace(action.space, (s) => ({ ...s, members: [...s.members, ...action.people.filter((p) => !s.members.includes(p))] })),
        items: [...state.items, ...action.people.map((p, i) => ({ ...note(action.space, ME, "invited", { person: p }), id: `${id}-${i}` }))],
        scripts: { ...state.scripts, [action.space]: [...(state.scripts[action.space] ?? []), ...extra] },
        left: null,
      };
    }
    case "leave": {
      const space = state.spaces.find((s) => s.id === action.space);
      if (!space) return state;
      const rest = state.spaces.filter((s) => s.id !== action.space);
      // Your threads that aren't in any other space are private again.
      const mine = space.threads.filter((t) => state.threads[t]?.owner === ME && !rest.some((s) => s.threads.includes(t))).map((t) => state.threads[t].title);
      return { ...state, n, spaces: rest, left: { name: space.name, mine } };
    }
    case "play": {
      const next = nextIn(state, action.space, action.kinds);
      if (!next) return state;
      const { event: e } = next;
      const played = { ...state.played, [action.space]: next.at + 1 };
      if (e.kind === "say") return { ...state, n, played, items: [...state.items, { id, space: action.space, kind: "say", by: e.by, text: e.text, ago: 0 }], left: null };
      if (e.kind === "add") {
        return {
          ...state,
          n,
          played,
          spaces: mapSpace(action.space, (s) => ({ ...s, threads: front(s.threads, e.thread), pins: [...s.pins, e.thread] })),
          items: [
            ...state.items,
            note(action.space, e.by, "added", { thread: e.thread }),
            { id: `${id}-u`, space: action.space, kind: "update", by: e.by, thread: e.thread, text: e.text, status: null, ago: 0, cheers: {} },
          ],
          left: null,
        };
      }
      const t = state.threads[e.thread];
      return {
        ...state,
        n,
        played,
        threads: e.status && t ? { ...state.threads, [t.id]: withStep(t, e.status) } : state.threads,
        spaces: mapSpace(action.space, (s) => ({ ...s, threads: front(s.threads, e.thread) })),
        items: [...state.items, { id, space: action.space, kind: "update", by: e.by, thread: e.thread, text: e.text, status: e.status ?? null, ago: 0, cheers: {} }],
        left: null,
      };
    }
  }
}

export function useSpaces() {
  return useReducer(reduce, undefined, initialSpaces);
}

/** The newest update on a thread in one space. */
export function latestUpdate(items: Item[], space: string, thread: string): Extract<Item, { kind: "update" }> | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.kind === "update" && it.space === space && it.thread === thread) return it;
  }
  return null;
}

/** Everyone but you who sees a thread: the people in every space it's in. */
export function audienceOf(state: SpacesState, thread: string): string[] {
  const ids = new Set(state.spaces.filter((s) => s.threads.includes(thread)).flatMap((s) => s.members));
  ids.delete(ME);
  return [...ids];
}
