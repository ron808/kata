"use client";

import { useState } from "react";
import type { Me } from "@/components/lab/cast";
import type { Concept } from "@/components/lab/concepts";
import { LabFrame } from "@/components/lab/LabFrame";
import { MY_SIDE_DRAFT, MY_UNSEEN_DRAFT, PASS_DEFAULT } from "./data";
import { InviteScreen, type SideState } from "./InviteScreen";
import { PassScreen, type PassState } from "./PassScreen";
import { PeopleScreen } from "./PeopleScreen";
import { UnfoldScreen, type UnfoldState } from "./UnfoldScreen";

/** Kasane: write your side. One state for the whole prototype, so each screen sees the others. */
export function KasanePrototype({ me, concept }: { me: Me; concept: Concept }) {
  const [pass, setPass] = useState<PassState>({ ...PASS_DEFAULT, note: "", passed: false });
  const [side, setSide] = useState<SideState>({
    remember: MY_SIDE_DRAFT,
    unseen: MY_UNSEEN_DRAFT,
    keepUnseen: false,
    sealed: false,
  });
  const [unfold, setUnfold] = useState<UnfoldState>({ unfolded: false, kept: false });

  return (
    <LabFrame
      concept={concept}
      screens={[
        { id: "pass", label: "Pass it on", content: <PassScreen me={me} state={pass} setState={setPass} /> },
        { id: "invite", label: "Your side", content: <InviteScreen me={me} side={side} setSide={setSide} unfolded={unfold.unfolded} /> },
        {
          id: "unfold",
          label: "The unfold",
          content: <UnfoldScreen me={me} side={side} setSide={setSide} state={unfold} setState={setUnfold} />,
        },
        { id: "people", label: "People", content: <PeopleScreen me={me} pass={pass} alfamaOpen={unfold.unfolded} /> },
      ]}
    />
  );
}
