import { slugify } from "@/lib/companion/text";

/**
 * A tag's hue. The same hash the home page uses for Kata's questions, so a tag that
 * belongs to no thread is one colour on home, on today's page, on a saved page and in Pages.
 */
export function tagHue(tag: string): number {
  return [...tag].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 8;
}

/** Hue for a tag, preferring the thread that owns it. */
export function hueForTag(tag: string, threadHues?: Record<string, number>): number {
  const own = threadHues?.[tag];
  return typeof own === "number" ? ((own % 8) + 8) % 8 : tagHue(tag);
}

/**
 * The tags threads own, with their hues. Kata files a thread's questions under the thread's
 * first tag (or its title), so that tag wears the thread's colour. Most recently touched wins.
 */
export function threadTagHues(threads: { title: string; tags?: string[]; hue?: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of threads) {
    const key = slugify(t.tags?.[0] ?? t.title);
    if (key && out[key] === undefined) out[key] = t.hue ?? 0;
  }
  return out;
}
