"use client";

import { useMemo, useState } from "react";
import { LabFrame } from "@/components/lab/LabFrame";
import type { Me } from "@/components/lab/cast";
import type { Concept } from "@/components/lab/concepts";
import { KeptForYou } from "./KeptForYou";
import { OpeningMorning } from "./OpeningMorning";
import { SealSheet } from "./SealSheet";
import { Shelf } from "./Shelf";
import { shelfFor, type Capsule } from "./data";

export function SealedPrototype({ me, concept }: { me: Me; concept: Concept }) {
  const base = useMemo(() => shelfFor(me), [me]);
  const [added, setAdded] = useState<Capsule[]>([]);
  const [offerOpened, setOfferOpened] = useState(false);

  return (
    <LabFrame
      concept={concept}
      screens={[
        { id: "seal", label: "Seal a page", content: <SealSheet me={me} onSeal={(c) => setAdded((a) => [c, ...a])} /> },
        { id: "shelf", label: "The shelf", content: <Shelf capsules={[...added, ...base]} offerOpened={offerOpened} /> },
        { id: "kept", label: "Kept for Mira", content: <KeptForYou me={me} /> },
        { id: "opening", label: "Opening morning", content: <OpeningMorning me={me} onOpened={setOfferOpened} /> },
      ]}
    />
  );
}
