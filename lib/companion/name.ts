/**
 * The companion inside Kata. Maru (丸, "circle") is the round mark a teacher draws on good
 * work in Japan, and the shape of the stickers on your map. Kata is the app; Maru talks.
 * Each writer can rename it and choose what it calls them.
 */
export const DEFAULT_COMPANION = "Maru";
export const COMPANION_NAME_MAX = 20;
export const NICKNAME_MAX = 30;

/** A few to pick from when choosing one. */
export const NAME_IDEAS = ["Maru", "Pip", "Juno", "Mochi", "Nori", "Bean"];

/**
 * Colours the companion can wear: its own vermilion, or one of the sticker hues (tomato is too
 * near vermilion to tell apart). Stored as the hue, null for vermilion.
 */
export const COMPANION_COLOURS: { hue: number | null; label: string }[] = [
  { hue: null, label: "Vermilion" },
  { hue: 1, label: "Sun" },
  { hue: 2, label: "Sky" },
  { hue: 3, label: "Mint" },
  { hue: 4, label: "Grape" },
  { hue: 5, label: "Pink" },
  { hue: 6, label: "Teal" },
  { hue: 7, label: "Orange" },
];

export const colourLabel = (hue: number | null) => COMPANION_COLOURS.find((c) => c.hue === hue)?.label ?? "Vermilion";

type Named = { companionName?: string | null; nickname?: string | null; name?: string | null; companionHue?: number | null } | null | undefined;

/** The hue this writer's companion wears, or null for vermilion. */
export function companionHueOf(user: Named): number | null {
  const h = user?.companionHue;
  return typeof h === "number" && Number.isInteger(h) && h >= 1 && h <= 7 ? h : null;
}

/** What this writer calls the companion. */
export function companionNameOf(user: Named): string {
  return user?.companionName?.trim() || DEFAULT_COMPANION;
}

/** What the companion calls the writer: their nickname, else their first name. */
export function nicknameOf(user: Named): string {
  return user?.nickname?.trim() || (user?.name ?? "").trim().split(/\s+/)[0] || "";
}

/** A name as typed, tidied: one line, no stray spaces, within the limit. Empty if nothing's left. */
export function tidyName(raw: string, max: number): string {
  return raw.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}
