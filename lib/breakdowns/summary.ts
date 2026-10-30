import type { BreakdownParts, BreakdownStats } from "@/lib/types";

/** The score in a word or two. */
export function verdictOf(score: number | null): string {
  if (score === null) return "Nothing to go on yet";
  if (score >= 9) return "A great stretch";
  if (score >= 7) return "Solid";
  if (score >= 5) return "Steady";
  if (score >= 3) return "Some movement";
  return "A quiet stretch";
}

export const percent = (n: number) => `${Math.round(n * 100)}%`;
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** "7 out of 10", or "no score yet". */
export const scoreText = (score: number | null) => (score === null ? "no score yet" : `${score} out of 10`);

/** The few facts a receipt or a list row has room for: "3 done · 1 stuck · habits 71% · wrote on 4 days". */
export function summaryLine(s: BreakdownStats, parts: BreakdownParts): string {
  const bits = [
    s.done.length ? `${s.done.length} done` : "",
    s.moved.length ? `${s.moved.length} moving` : "",
    s.stuck.length ? `${s.stuck.length} stuck` : "",
    parts.habits !== null ? `habits ${percent(parts.habits)}` : "",
    s.pages.days.length ? `wrote on ${plural(s.pages.days.length, "day")}` : "",
  ].filter(Boolean);
  if (bits.length) return bits.slice(0, 4).join(" · ");
  return s.active.length ? `Something on ${plural(s.active.length, "day")}` : "Nothing logged";
}
