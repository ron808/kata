/**
 * When someone counts as here or typing, shared by the server and the browser. The shell's pulse
 * keeps `lastSeenAt` at most a minute old while Kata is open, so two minutes means they're here now.
 */
export const ACTIVE_FOR_MS = 2 * 60_000;
/** Typing pings come every few seconds while they type; one this old means they stopped. */
export const TYPING_FOR_MS = 6_000;

/** "Active now", "Active 5 min ago", or nothing once it's been a day. */
export function activeLabel(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const ago = now - Date.parse(iso);
  if (!Number.isFinite(ago)) return null;
  if (ago < ACTIVE_FOR_MS) return "Active now";
  const min = Math.round(ago / 60_000);
  if (min < 60) return `Active ${min} min ago`;
  const hours = Math.round(min / 60);
  return hours < 24 ? `Active ${hours} h ago` : null;
}

export const isActiveNow = (iso: string | null | undefined, now = Date.now()) => Boolean(iso) && now - Date.parse(iso!) < ACTIVE_FOR_MS;
