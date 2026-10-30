"use client";

import { useState } from "react";
import type { Me } from "@/components/lab/cast";
import type { Concept } from "@/components/lab/concepts";
import { LabFrame, showLabScreen } from "@/components/lab/LabFrame";
import { MailboxScreen } from "./MailboxScreen";
import { PostcardScreen } from "./PostcardScreen";
import { SlipScreen } from "./SlipScreen";
import { SlowMailScreen } from "./SlowMailScreen";

export function SundayPostPrototype({ me, concept }: { me: Me; concept: Concept }) {
  // Who the Slow mail sheet is addressed to; "Write back" in the mailbox sets it.
  const [to, setTo] = useState<string | null>(null);

  // "Write back to Mira": address the sheet, then turn to the Slow mail screen.
  function writeBack(id: string) {
    setTo(id);
    showLabScreen("slow-mail");
    setTimeout(() => document.getElementById("slow-body")?.focus({ preventScroll: true }), 120);
  }

  return (
    <LabFrame
      concept={concept}
      screens={[
        { id: "mailbox", label: "Sunday post", content: <MailboxScreen me={me} onWriteBack={writeBack} /> },
        { id: "postcard", label: "Your postcard", content: <PostcardScreen me={me} /> },
        { id: "slow-mail", label: "Slow mail", content: <SlowMailScreen me={me} to={to} setTo={setTo} /> },
        { id: "slips", label: "Slips", content: <SlipScreen me={me} /> },
      ]}
    />
  );
}
