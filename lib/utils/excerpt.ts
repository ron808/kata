import type { Entry } from "@/lib/types";

/** The first written words of an entry: its first long answer, else any text answer. */
export function firstLines(entry: Pick<Entry, "fields">, max = 160): string {
  const long = entry.fields.find((f) => f.type === "long_text" && typeof f.value === "string" && f.value.trim());
  const any = entry.fields.find((f) => typeof f.value === "string" && f.value.trim());
  const text = String((long ?? any)?.value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}

/** The first one or two sentences of a letter. */
export function firstSentences(text: string, count = 2): string {
  return text
    .split(/\n\s*\n/)[0]
    .split(/(?<=[.?!])\s/)
    .slice(0, count)
    .join(" ");
}
