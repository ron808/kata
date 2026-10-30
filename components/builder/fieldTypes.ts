import type { IconName } from "@/components/shared/Icon";
import type { FieldType } from "@/lib/types";

/**
 * The ten kinds of field. Each kind owns a hue (see AGENTS.md § Colour), so a
 * question reads as the same colour in the palette, on its card in the builder
 * and as a sticker in the gallery. Dividers are structure, not questions: no hue.
 */
export const FIELD_TYPE_META: Record<
  FieldType,
  { label: string; description: string; icon: IconName; defaultLabel: string; hue: number | null }
> = {
  short_text: {
    label: "Short text",
    description: "A line or two",
    icon: "text-short",
    defaultLabel: "Short answer",
    hue: 2,
  },
  long_text: {
    label: "Long text",
    description: "Room to write; grows as you do",
    icon: "text-long",
    defaultLabel: "Long answer",
    hue: 0,
  },
  mood_slider: {
    label: "Mood",
    description: "Five faces, your own scale",
    icon: "smile",
    defaultLabel: "Mood",
    hue: 5,
  },
  energy: {
    label: "Energy",
    description: "One to five bolts",
    icon: "bolt",
    defaultLabel: "Energy",
    hue: 1,
  },
  number: {
    label: "Number",
    description: "A count with a unit",
    icon: "hash",
    defaultLabel: "Count",
    hue: 4,
  },
  tags: {
    label: "Tags",
    description: "Group days by project or theme",
    icon: "tag",
    defaultLabel: "Tags",
    hue: 3,
  },
  yes_no: {
    label: "Yes / No",
    description: "Did it happen?",
    icon: "toggle",
    defaultLabel: "Did it happen?",
    hue: 6,
  },
  rating: {
    label: "Rating",
    description: "One to five stars",
    icon: "star",
    defaultLabel: "Rating",
    hue: 7,
  },
  link: {
    label: "Link",
    description: "A URL worth keeping",
    icon: "link",
    defaultLabel: "Link",
    hue: 2,
  },
  divider: {
    label: "Divider",
    description: "Break the page into sections",
    icon: "divider",
    defaultLabel: "Section",
    hue: null,
  },
};

export const PALETTE_ORDER: FieldType[] = [
  "long_text",
  "short_text",
  "mood_slider",
  "energy",
  "rating",
  "number",
  "yes_no",
  "tags",
  "link",
  "divider",
];

/** A page holds at most this many fields (the API's limit). */
export const MAX_FIELDS = 20;

/** Lowercase, without punctuation: for spotting a question that's already on a page. */
export function sameQuestion(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return norm(a) === norm(b);
}
