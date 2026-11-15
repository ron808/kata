"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/shared/Icon";
import { Board } from "./Board";
import { OneThread } from "./OneThread";
import { Room } from "./Room";
import type { Who } from "./data";

/*
 * Three ways to share threads with a few people, on made-up people and threads, in this browser
 * only. Each version keeps its own state while you switch between them; Start over resets the
 * one you're on. Pick one and the other two go.
 */

const VERSIONS = [
  {
    id: "board",
    name: "Board",
    says: "A space is a board. Each thread in it is a card: whose it is, where it is and its owner’s latest update, with a tap to cheer them on.",
  },
  {
    id: "room",
    name: "Room",
    says: "A space is a conversation. Its threads are pinned above it, and updates on them arrive in it, between what people say.",
  },
  {
    id: "thread",
    name: "One thread",
    says: "No spaces at all. You share one thread with the people you pick, and they add their own updates and comments to it.",
  },
] as const;
type Version = (typeof VERSIONS)[number]["id"];

export function SpacesLab({ me, today, tz, now }: { me: Who; today: string; tz: string; now: string }) {
  const [version, setVersion] = useState<Version>("board");
  const [runs, setRuns] = useState<Record<Version, number>>({ board: 0, room: 0, thread: 0 });
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const props = { me, today, tz, now };

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = VERSIONS.findIndex((v) => v.id === version);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + VERSIONS.length) % VERSIONS.length;
    setVersion(VERSIONS[next].id);
    radios.current[next]?.focus();
  }
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        {/* One row of equal steps, the view switch; arrow keys move along it like any radio group. */}
        <div role="radiogroup" aria-label="Version" className="scale w-full max-w-[30rem]" onKeyDown={onKey}>
          {VERSIONS.map((v, i) => (
            <button
              key={v.id}
              ref={(el) => {
                radios.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={version === v.id}
              tabIndex={version === v.id ? 0 : -1}
              className="scale-step scale-row text-[0.875rem] focus-visible:-outline-offset-4 sm:text-[0.9375rem]"
              onClick={() => setVersion(v.id)}
            >
              {v.name}
            </button>
          ))}
        </div>
        <button type="button" className="chip" onClick={() => setRuns((r) => ({ ...r, [version]: r[version] + 1 }))}>
          <Icon name="refresh" className="h-4 w-4" />
          Start over
        </button>
      </div>
      <p className="max-w-3xl text-[0.9375rem] text-ink/75">{VERSIONS.find((v) => v.id === version)!.says}</p>

      <div hidden={version !== "board"} data-version="board">
        <Board key={runs.board} {...props} />
      </div>
      <div hidden={version !== "room"} data-version="room">
        <Room key={runs.room} {...props} active={version === "room"} />
      </div>
      <div hidden={version !== "thread"} data-version="thread">
        <OneThread key={runs.thread} {...props} />
      </div>

      <p className="text-[0.875rem] text-ink/70">Made-up people and threads, for trying it. Nothing here is saved or sent, and nobody sees what you do here.</p>
    </div>
  );
}
