/**
 * What a thread keeps a value on, made up for each one: minutes and kilometres for a walk,
 * pages for a book, guests for a party. Maru suggests them (the model, or the guesses here when
 * it gives none) and the writer keeps the ones they want. Client-safe: the forms use the
 * guesses as you type.
 */

export const FIELDS_MAX = 4;

export type ThreadFieldType = "number" | "text";

export interface FieldSpec {
  label: string;
  type: ThreadFieldType;
  /** What a number counts in ("min", "km"); empty for a plain count. */
  unit: string;
  /** A number to reach each day. */
  goal: number | null;
}

export function fieldKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

const num = (label: string, unit = ""): FieldSpec => ({ label, type: "number", unit, goal: null });

// What's usually worth a number, from words in a title. The first match wins, so writing a
// novel counts words before reading one counts pages.
const GUESSES: [RegExp, FieldSpec[]][] = [
  [/\b(?:walk|hike|stroll)/i, [num("Minutes", "min"), num("Km", "km")]],
  [/\b(?:run|jog|marathon|5k|10k)/i, [num("Km", "km"), num("Minutes", "min")]],
  [/\b(?:cycl|bike|biking|ride)/i, [num("Km", "km"), num("Minutes", "min")]],
  [/\bswim/i, [num("Laps"), num("Minutes", "min")]],
  [/\bsteps?\b/i, [num("Steps")]],
  [/\b(?:writ|draft|essay|blog|newsletter)/i, [num("Words")]],
  [/\b(?:read|book|novel)/i, [num("Pages"), num("Minutes", "min")]],
  [/\b(?:gym|workout|lift|strength|yoga|stretch|exercise|pilates|train)/i, [num("Minutes", "min")]],
  [/\b(?:meditat|breath|mindful)/i, [num("Minutes", "min")]],
  [/\b(?:sleep|bedtime|bed time)/i, [num("Hours", "h")]],
  [/\b(?:water|hydrat)/i, [num("Glasses")]],
  [/\b(?:weight|kilos|pounds)/i, [num("Weight", "kg")]],
  [/\b(?:apply|applications?|job hunt)/i, [num("Applications")]],
  [/\b(?:save|saving|budget|spend)/i, [num("Amount")]],
  [/\b(?:study|learn|course|practi[cs]e|piano|guitar|spanish|french|german|japanese|language|coding|leetcode)/i, [num("Minutes", "min")]],
];

/** Kinds that are done again and again, so a number on them makes sense. */
export const TRACKED_KINDS = new Set(["habit", "goal", "health", "learning"]);

/** Fields worth suggesting for a thread by its title, for the kinds that repeat. */
export function guessFields(title: string, kind?: string | null): FieldSpec[] {
  if (kind && !TRACKED_KINDS.has(kind)) return [];
  return GUESSES.find(([test]) => test.test(title))?.[1].map((f) => ({ ...f })) ?? [];
}

const tidy = (s: string, max: number) => s.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Minutes (min)", "Steps (goal 8000)", "Venue (text)": a field as written in a form. */
function specFromText(raw: string): FieldSpec | null {
  const m = raw.match(/^\s*([^()]+?)\s*(?:\(([^)]*)\))?\s*$/);
  const label = cap(tidy(m?.[1] ?? "", 30));
  if (!label) return null;
  let unit = "";
  let goal: number | null = null;
  let type: ThreadFieldType = "number";
  for (const part of (m?.[2] ?? "").split(",").map((p) => p.trim()).filter(Boolean)) {
    const g = part.match(/^goal\s+([\d.]+)/i);
    if (g) goal = Number(g[1]) || null;
    else if (/^text$/i.test(part)) type = "text";
    else unit = tidy(part, 12);
  }
  return { label, type, unit: type === "text" ? "" : unit, goal: type === "text" ? null : goal };
}

/**
 * Fields from what the model or a form sent: [{name, unit, goal, text}], ["Minutes (min)"], or
 * "Minutes (min), Km". At most four, each name once.
 */
export function parseTrack(raw: unknown): FieldSpec[] {
  const items: unknown[] = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out: FieldSpec[] = [];
  for (const item of items) {
    let spec: FieldSpec | null = null;
    if (typeof item === "string") spec = specFromText(item);
    else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const label = cap(tidy(String(o.name ?? o.label ?? ""), 30));
      if (label) {
        const text = o.text === true || o.type === "text";
        const goal = typeof o.goal === "number" && Number.isFinite(o.goal) && o.goal > 0 ? o.goal : null;
        spec = { label, type: text ? "text" : "number", unit: text ? "" : tidy(String(o.unit ?? ""), 12), goal: text ? null : goal };
      }
    }
    if (spec && fieldKey(spec.label) && !out.some((s) => fieldKey(s.label) === fieldKey(spec!.label))) out.push(spec);
    if (out.length === FIELDS_MAX) break;
  }
  return out;
}

/** A field as one item in a form: "Minutes (min)", "Steps (goal 8000)", "Venue (text)". */
export function specText(s: Pick<FieldSpec, "label" | "unit" | "type"> & { goal?: number | null }): string {
  const extra = s.type === "text" ? ["text"] : [s.unit, s.goal ? `goal ${s.goal}` : ""].filter(Boolean);
  return extra.length ? `${s.label} (${extra.join(", ")})` : s.label;
}

/** An item from a form as it reads on a chip: "Minutes · min", "Steps · goal 8,000". */
export function specLabel(text: string): string {
  const [s] = parseTrack([text]);
  if (!s) return text;
  const extra = s.type === "text" ? [] : [s.unit, s.goal ? `goal ${amount(s.goal)}` : ""].filter(Boolean);
  return [s.label, ...extra].join(" · ");
}

const amount = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** A value as it reads: "30 min", "6 glasses", "Olive Garden". */
export function valueText(f: Pick<FieldSpec, "label" | "unit" | "type">, value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  if (f.type === "text" || typeof value === "string") return String(value);
  if (f.unit) return `${amount(value)} ${f.unit}`;
  // A plural name or a unit reads as the count's noun: "6 glasses", "12 pages", "2.5 km".
  return /s$|^(?:km|mi|kg|lb|h|hr|min|k)$/i.test(f.label) ? `${amount(value)} ${f.label.toLowerCase()}` : `${f.label} ${amount(value)}`;
}
