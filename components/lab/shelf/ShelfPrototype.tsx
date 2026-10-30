"use client";

import { useState } from "react";
import { LabFrame } from "@/components/lab/LabFrame";
import type { Me } from "@/components/lab/cast";
import type { Concept } from "@/components/lab/concepts";
import { ColophonScreen } from "./ColophonScreen";
import { EditionScreen } from "./EditionScreen";
import { PublishScreen } from "./PublishScreen";
import { ShelfScreen } from "./ShelfScreen";
import { BOOKS, MY_LEAVES, SEAL_BOOK, type Leaf } from "./data";

export interface PublishedLeaf {
  leaf: Leaf;
  cooling: boolean;
}

/** Everything the four screens share, so a leaf published on one shows on another. */
export interface ShelfState {
  slots: (string | null)[];
  /** Books opened this session: their new-leaf dots are cleared. */
  opened: string[];
  /** The book that most recently arrived on the shelf. */
  arrived: string | null;
  /** Books taken down this session, most recent first, so they can be put back. */
  takenDown: string[];
  published: PublishedLeaf | null;
  seals: { bookId: string; notes: number }[];
  lastSeal: string | null;
}

export function ShelfPrototype({ me, concept }: { me: Me; concept: Concept }) {
  const [state, setState] = useState<ShelfState>({
    slots: BOOKS.map((b) => b.id),
    opened: [],
    arrived: null,
    takenDown: [],
    published: null,
    seals: SEAL_BOOK,
    lastSeal: null,
  });

  const actions = {
    open(id: string) {
      setState((s) => (s.opened.includes(id) ? s : { ...s, opened: [...s.opened, id] }));
    },
    takeDown(id: string) {
      setState((s) => ({
        ...s,
        slots: s.slots.map((x) => (x === id ? null : x)),
        takenDown: [id, ...s.takenDown.filter((t) => t !== id)],
        arrived: s.arrived === id ? null : s.arrived,
      }));
    },
    /** Place a book in a given slot (or the first empty one), taking down whatever is there. */
    place(id: string, slot?: number) {
      setState((s) => {
        const at = slot ?? s.slots.indexOf(null);
        if (at < 0) return s;
        const out = s.slots[at];
        return {
          ...s,
          slots: s.slots.map((x, i) => (i === at ? id : x)),
          takenDown: [...(out ? [out] : []), ...s.takenDown.filter((t) => t !== id)],
          arrived: id,
        };
      });
    },
    publish(p: PublishedLeaf | null) {
      setState((s) => ({ ...s, published: p }));
    },
    pressSeal(bookId: string) {
      setState((s) => {
        const has = s.seals.find((x) => x.bookId === bookId);
        const seals = has
          ? s.seals.map((x) => (x.bookId === bookId ? { ...x, notes: x.notes + 1 } : x))
          : [...s.seals, { bookId, notes: 1 }];
        return { ...s, seals, lastSeal: bookId };
      });
    },
  };

  const myLeaves: (Leaf & { cooling?: boolean })[] = state.published
    ? [{ ...state.published.leaf, cooling: state.published.cooling }, ...MY_LEAVES]
    : MY_LEAVES;

  return (
    <LabFrame
      concept={concept}
      screens={[
        { id: "colophon", label: "Your colophon", content: <ColophonScreen me={me} leaves={myLeaves} /> },
        { id: "publish", label: "Publish a leaf", content: <PublishScreen me={me} published={state.published} onPublish={actions.publish} /> },
        { id: "shelf", label: "The Shelf", content: <ShelfScreen state={state} actions={actions} /> },
        { id: "edition", label: "Sunday Edition", content: <EditionScreen me={me} state={state} actions={actions} /> },
      ]}
    />
  );
}

export type ShelfActions = {
  open: (id: string) => void;
  takeDown: (id: string) => void;
  place: (id: string, slot?: number) => void;
  publish: (p: PublishedLeaf | null) => void;
  pressSeal: (bookId: string) => void;
};
