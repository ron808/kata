"use client";

import { useState, type KeyboardEvent } from "react";
import { STICKERS } from "@/lib/stickers";
import { Sticker } from "./Sticker";

/** A short, everyday set, with names for screen readers. The phone's own emoji keyboard has the rest. */
const EMOJI: readonly [string, string][] = [
  ["😀", "grinning"], ["😂", "tears of joy"], ["🥹", "holding back tears"], ["😊", "smiling"], ["😍", "heart eyes"], ["🥰", "smiling with hearts"], ["😘", "kiss"], ["😎", "sunglasses"],
  ["🤔", "thinking"], ["🙃", "upside down"], ["😅", "sweat smile"], ["😭", "crying"], ["😴", "sleeping"], ["🥳", "party face"], ["🤯", "mind blown"], ["😬", "grimacing"],
  ["👍", "thumbs up"], ["👏", "clapping"], ["🙌", "raised hands"], ["🙏", "folded hands"], ["💪", "flexed arm"], ["👋", "waving"], ["🤝", "handshake"], ["✌️", "victory"],
  ["❤️", "red heart"], ["🧡", "orange heart"], ["💛", "yellow heart"], ["💚", "green heart"], ["💙", "blue heart"], ["💜", "purple heart"], ["🔥", "fire"], ["✨", "sparkles"],
  ["🎉", "party popper"], ["☕", "coffee"], ["🌱", "seedling"], ["🌙", "moon"], ["⭐", "star"], ["📚", "books"], ["🏃", "running"], ["🍕", "pizza"],
];
const NAMES = new Map(EMOJI);
const RECENT_KEY = "kata-emoji-recent";

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((e): e is string => typeof e === "string" && NAMES.has(e)).slice(0, 8) : [];
  } catch {
    return [];
  }
}

/**
 * The picker under the message box: emoji go into the message where the cursor is, a sticker
 * sends at once. Escape closes it. Recently used emoji (kept on this device) come first.
 */
export function Picker({ id, onEmoji, onSticker, onClose }: { id: string; onEmoji: (e: string) => void; onSticker: (id: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");
  const [recent, setRecent] = useState<string[]>(readRecent);

  function pick(e: string) {
    const next = [e, ...recent.filter((r) => r !== e)].slice(0, 8);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
    onEmoji(e);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  }

  const grid = (list: readonly string[]) =>
    list.map((e) => (
      <button
        key={e}
        type="button"
        onClick={() => pick(e)}
        aria-label={NAMES.get(e)}
        className="grid h-11 w-full place-items-center rounded-sm text-[1.6rem] leading-none transition-colors hover:bg-ink/[0.07] focus-visible:bg-ink/[0.07]"
      >
        {e}
      </button>
    ));

  return (
    // In the chat's fixed-height card the picker gives way first, down to one row, so the box never goes under the tab bar.
    <div id={id} role="group" aria-label="Emoji and stickers" onKeyDown={onKeyDown} className="well mt-2 flex min-h-0 flex-col p-2">
      <div role="tablist" aria-label="Emoji or stickers" className="scale shrink-0">
        {(["emoji", "stickers"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="scale-step min-h-11">
            {t === "emoji" ? "Emoji" : "Stickers"}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-2 max-h-[min(15rem,30svh)] min-h-[4.75rem] flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {tab === "emoji" ? (
          <>
            {recent.length ? (
              <>
                <p className="px-1 pb-1 text-[0.8125rem] font-semibold text-ink/65">Recent</p>
                <div className="grid grid-cols-8 gap-0.5">{grid(recent)}</div>
                <p className="px-1 pb-1 pt-2 text-[0.8125rem] font-semibold text-ink/65">All</p>
              </>
            ) : null}
            <div className="grid grid-cols-8 gap-0.5">{grid(EMOJI.map(([e]) => e))}</div>
          </>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1 p-1">
            {STICKERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSticker(s.id)}
                aria-label={`Send the ${s.label} sticker`}
                className="grid min-h-[4.75rem] place-items-center rounded-md p-1 transition-colors hover:bg-ink/[0.07] focus-visible:bg-ink/[0.07]"
              >
                <Sticker id={s.id} size={56} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
