import { parseKataFieldId } from "@/lib/questions/daily";
import type { EntryField } from "@/lib/types";
import type { Passage } from "./ShareLine";

const MAX_TEXT = 500;
const MAX_PASSAGES = 8;

function clip(text: string): string {
  if (text.length <= MAX_TEXT) return text;
  const cut = text.slice(0, MAX_TEXT - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), MAX_TEXT - 40))}…`;
}

/** Sentences of a written answer, in order. Paragraph breaks always end one. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((para) => para.replace(/\s+/g, " ").trim().split(/(?<=[.!?…])\s+(?=["“‘'(]?[A-Z0-9])/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

/** The lines of a page someone could share, each with the prompt it answers. */
export function passagesOf(fields: EntryField[]): Passage[] {
  const seen = new Set<string>();
  const out: Passage[] = [];
  for (const f of fields) {
    if ((f.type !== "long_text" && f.type !== "short_text") || typeof f.value !== "string") continue;
    const tag = parseKataFieldId(f.fieldId)?.tag ?? null;
    for (const s of sentencesOf(f.value)) {
      const text = clip(s);
      if (seen.has(text)) continue;
      seen.add(text);
      out.push({ text, from: f.label, tag });
      if (out.length >= MAX_PASSAGES) return out;
    }
  }
  return out;
}
