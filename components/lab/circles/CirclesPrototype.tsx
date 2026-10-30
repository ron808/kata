"use client";

import { useState } from "react";
import { LabFrame } from "@/components/lab/LabFrame";
import type { Me } from "@/components/lab/cast";
import type { Concept } from "@/components/lab/concepts";
import { DEFAULT_FIELDS, DEFAULT_LINE, DEFAULT_MOOD, type PageField } from "./data";
import { Tonight } from "./Tonight";
import { OfferBuilder } from "./OfferBuilder";
import { SaturdayPreview } from "./SaturdayPreview";
import { SundayLetter } from "./SundayLetter";

/** What the screens share: tonight's page, which fields are offered, what you struck. */
export interface CircleState {
  me: Me;
  line: string;
  mood: number;
  sealed: boolean;
  fields: PageField[];
  struck: Record<string, boolean>;
}

export interface CircleActions {
  setLine: (v: string) => void;
  setMood: (v: number) => void;
  setSealed: (v: boolean) => void;
  setFields: (f: PageField[]) => void;
  toggleStrike: (dayId: string) => void;
}

export function CirclesPrototype({ me, concept }: { me: Me; concept: Concept }) {
  const [line, setLine] = useState(DEFAULT_LINE);
  const [mood, setMood] = useState(DEFAULT_MOOD);
  const [sealed, setSealed] = useState(false);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [struck, setStruck] = useState<Record<string, boolean>>({});

  const state: CircleState = { me, line, mood, sealed, fields, struck };
  const actions: CircleActions = {
    setLine,
    setMood,
    setSealed,
    setFields,
    toggleStrike: (id) => setStruck((s) => ({ ...s, [id]: !s[id] })),
  };

  return (
    <LabFrame
      concept={concept}
      screens={[
        { id: "tonight", label: "Tonight", content: <Tonight state={state} actions={actions} /> },
        { id: "builder", label: "What they see", content: <OfferBuilder state={state} actions={actions} /> },
        { id: "saturday", label: "Saturday", content: <SaturdayPreview state={state} actions={actions} /> },
        { id: "letter", label: "Sunday letter", content: <SundayLetter state={state} actions={actions} /> },
      ]}
    />
  );
}
