"use client";

import type { Me } from "@/components/lab/cast";
import type { Concept } from "@/components/lab/concepts";
import { LabFrame, showLabScreen } from "@/components/lab/LabFrame";
import { SundayLetter } from "./SundayLetter";
import { ThirdCarry } from "./ThirdCarry";
import { TodayPage } from "./TodayPage";
import { WitnessCard } from "./WitnessCard";

export function PromisesPrototype({ me, concept }: { me: Me; concept: Concept }) {
  const goTo = showLabScreen;

  return (
    <LabFrame
      concept={concept}
      screens={[
        { id: "today", label: "Today’s page", content: <TodayPage me={me} onGoToThird={() => goTo("third")} /> },
        { id: "third", label: "Third day", content: <ThirdCarry me={me} /> },
        { id: "witness", label: "Witness card", content: <WitnessCard me={me} /> },
        { id: "letter", label: "Sunday letter", content: <SundayLetter me={me} /> },
      ]}
    />
  );
}
