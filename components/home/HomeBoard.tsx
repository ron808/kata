"use client";

import { useState, type ReactNode } from "react";
import type { KataMessage, ThreadT } from "@/lib/types";
import { Conversation } from "./Conversation";
import { MindCard } from "./MindCard";

/**
 * The interactive heart of home: the conversation and the map share one set of threads,
 * so answering a check-in moves the sticker it's about. On phones the four pieces stack
 * as conversation, map, questions, aside; on desktop the chat and the map share a row.
 */
export function HomeBoard({
  messages,
  threads: initialThreads,
  today,
  tz,
  checkInLine,
  moodWeek,
  ai,
  questions,
  aside,
}: {
  messages: KataMessage[];
  ai: boolean;
  moodWeek: (number | null)[];
  threads: ThreadT[];
  today: string;
  tz: string;
  checkInLine: string;
  questions: ReactNode;
  aside: ReactNode;
}) {
  const [threads, setThreads] = useState(initialThreads);
  const update = (t: ThreadT) => setThreads((ts) => ts.map((x) => (x._id === t._id ? t : x)));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
      {/* On desktop the chat is exactly as tall as the map beside it: height 0 keeps it out of
          the row's sizing, min-height 100% fills the row. It scrolls inside instead of growing. */}
      <div className="flex min-w-0 flex-col lg:col-span-7 lg:h-0 lg:min-h-full">
        <Conversation initial={messages} onThreads={setThreads} checkInLine={checkInLine} moodWeek={moodWeek} today={today} ai={ai} />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <MindCard threads={threads} today={today} tz={tz} onChange={update} />
      </div>
      <div className="grid min-w-0 grid-cols-1 content-start gap-5 lg:col-span-7 lg:gap-6">{questions}</div>
      <div className="grid min-w-0 grid-cols-1 content-start gap-5 lg:col-span-5 lg:gap-6">{aside}</div>
    </div>
  );
}
