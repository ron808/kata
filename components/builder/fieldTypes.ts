import type { FieldType } from "@/lib/types";

export const FIELD_TYPE_META: Record<
  FieldType,
  { label: string; description: string; icon: string; defaultLabel: string }
> = {
  short_text: {
    label: "Short text",
    description: "Single-line input",
    icon: "—",
    defaultLabel: "Short answer",
  },
  long_text: {
    label: "Long text",
    description: "Multi-line, auto-expand",
    icon: "≡",
    defaultLabel: "Long answer",
  },
  mood_slider: {
    label: "Mood slider",
    description: "Emoji 1-5 scale",
    icon: "☺",
    defaultLabel: "Mood",
  },
  energy: {
    label: "Energy level",
    description: "Lightning bolt 1-5",
    icon: "⚡",
    defaultLabel: "Energy",
  },
  number: {
    label: "Number",
    description: "Numeric with unit",
    icon: "#",
    defaultLabel: "Count",
  },
  tags: {
    label: "Tags",
    description: "Multi-select tags",
    icon: "▦",
    defaultLabel: "Tags",
  },
  yes_no: {
    label: "Yes / No",
    description: "Two-button toggle",
    icon: "◐",
    defaultLabel: "Did it happen?",
  },
  rating: {
    label: "Rating",
    description: "5-star scale",
    icon: "★",
    defaultLabel: "Rating",
  },
  link: {
    label: "Link",
    description: "URL input with preview",
    icon: "↗",
    defaultLabel: "Link",
  },
  divider: {
    label: "Divider",
    description: "Visual section break",
    icon: "—",
    defaultLabel: "Section",
  },
};

export const FIELD_TYPES: FieldType[] = [
  "short_text",
  "long_text",
  "long_text" as never, // placeholder; see ordering below — will dedupe
];

export const PALETTE_ORDER: FieldType[] = [
  "short_text",
  "long_text",
  "mood_slider",
  "energy",
  "number",
  "tags",
  "yes_no",
  "rating",
  "link",
  "divider",
];
