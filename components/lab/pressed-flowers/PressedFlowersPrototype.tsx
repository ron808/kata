"use client";

import { LabFrame } from "@/components/lab/LabFrame";
import type { Me } from "@/components/lab/cast";
import type { Concept } from "@/components/lab/concepts";
import { AlmanacScreen } from "./AlmanacScreen";
import { AnniversaryScreen } from "./AnniversaryScreen";
import { LendScreen } from "./LendScreen";
import { TodayScreen } from "./TodayScreen";

export function PressedFlowersPrototype({ me, concept }: { me: Me; concept: Concept }) {
  return (
    <LabFrame
      concept={concept}
      screens={[
        { id: "today", label: "On this day", content: <TodayScreen me={me} /> },
        { id: "anniversary", label: "One year on", content: <AnniversaryScreen me={me} /> },
        { id: "ask", label: "Ask my almanac", content: <AlmanacScreen me={me} /> },
        { id: "lend", label: "Lend pages", content: <LendScreen me={me} /> },
      ]}
    />
  );
}
