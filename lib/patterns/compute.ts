/*
 * Patterns: what went with better or worse moods and energy, worked out from what the writer
 * logged. Each thing they keep (a habit, a number, a page's yes-or-no question or tag, moving a
 * thread forward) splits their days in two, and the average mood (and energy) of the two sides
 * is compared. A gap is only called a pattern when it's bigger than chance would usually make
 * with that many days, and it says what went together, never what caused what. No model, so the
 * same days always give the same patterns. Client-safe: the Lab draws it on example days.
 */

/** How far back patterns look, in days. Numbers on threads keep about as many. */
export const WINDOW_DAYS = 60;
/** Days with a mood on each side before two sides are compared. */
export const MIN_SIDE = 4;
/** Days with a mood (or energy) before anything is said at all. */
export const MIN_DAYS = 2 * MIN_SIDE;

export type Outcome = "mood" | "energy";
export type ActivityKind = "habit" | "number" | "yes" | "tag" | "moved";
export type Strength = "clear" | "maybe" | "none";

const OUTCOMES: Outcome[] = ["mood", "energy"];

export interface Activity {
  /** Stable from one load to the next: "habit:<thread>", "number:<thread>:<field>", "yes:<question>"… */
  key: string;
  kind: ActivityKind;
  title: string;
  /** What a thread's number measures ("Km"); empty otherwise. */
  detail: string;
  /** The thread's colour; null for a page's own question or tag, drawn in ink. */
  hue: number | null;
  href: string | null;
  /** The two sides in words: ["Done", "Not done"], ["3 km or more", "Under 3 km"]. */
  sides: [string, string];
  /** Each day it can speak for, on the first side (true) or the second. A number's come from its values. */
  on: Record<string, boolean>;
  /** A number's days, split into higher and lower when the patterns are worked out. */
  values?: { day: string; value: number }[];
  goal?: number | null;
  /** How its values read: "km", "glasses"; empty for a bare number. */
  unit?: string;
}

/** An activity as a pattern carries it: without its days. */
export type ActivityRef = Omit<Activity, "on" | "values" | "goal" | "unit">;

export interface DayOf {
  day: string;
  /** 1 (foggy) to 5 (bright), or null. */
  mood: number | null;
  /** 1 (empty) to 5 (full), or null. */
  energy: number | null;
}

export interface Side {
  label: string;
  days: number;
  /** To one decimal. */
  average: number;
}

export interface Pattern {
  key: string;
  activity: ActivityRef;
  outcome: Outcome;
  yes: Side;
  no: Side;
  /** The first side's average less the second's. */
  gap: number;
  /** How many standard errors apart the two sides are: what decides the strength and the order. */
  t: number;
  strength: Strength;
}

export interface Waiting {
  key: string;
  activity: ActivityRef;
  /** Days with a mood (or, without one, an energy level) on each side so far. */
  days: [number, number];
  /** Where it stands, in a few words: "2 done, 26 not done", "Logged on 3 days". */
  note: string;
}

export interface Patterns {
  from: string;
  upTo: string;
  /** Days with a mood, and days with an energy level. */
  moods: number;
  energies: number;
  /** Clear ones first, then the ones worth watching; the strongest first within each. */
  found: Pattern[];
  /** Compared, with no clear gap. */
  flat: Pattern[];
  /** Too few days on one side to compare yet. */
  waiting: Waiting[];
  days: DayOf[];
  /** With each number split into its two sides. */
  activities: Activity[];
}

// ── Moods and energy by day ─────────────────────────────────────────────────

/** A page's own answer of a type ("mood_slider", "energy"), when it's a number from 1 to 5. */
export function pageScale(fields: { type: string; value?: unknown }[] | undefined, type: string): number | null {
  const f = fields?.find((x) => x.type === type && typeof x.value === "number" && x.value >= 1 && x.value <= 5);
  return f ? (f.value as number) : null;
}

/**
 * A day's mood: the page's own answer when its page asks, else the last mood check-in that day.
 * Check-ins come oldest first. Breakdowns, recent pages and patterns all read a day this way.
 */
export function dayMoods(said: { day: string; mood: number }[], pages: { day: string; fields?: { type: string; value?: unknown }[] }[]): Map<string, number> {
  const moods = new Map(said.map((m) => [m.day, m.mood]));
  for (const p of pages) {
    const own = pageScale(p.fields, "mood_slider");
    if (own !== null) moods.set(p.day, own);
  }
  return moods;
}

// ── The arithmetic ───────────────────────────────────────────────────────────

const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
const varianceOf = (xs: number[], m: number) => (xs.length > 1 ? xs.reduce((n, x) => n + (x - m) ** 2, 0) / (xs.length - 1) : 0);
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
// Answers on a scale of five are coarse: four days that all say "Good" don't make a gap certain.
const FLOOR = 0.25;

/** Two sides' averages, and how many standard errors apart they are (Welch's t). */
export function compare(yes: number[], no: number[]): { yes: number; no: number; gap: number; t: number } {
  const a = mean(yes);
  const b = mean(no);
  const se = Math.sqrt(Math.max(varianceOf(yes, a), FLOOR) / yes.length + Math.max(varianceOf(no, b), FLOOR) / no.length);
  return { yes: a, no: b, gap: a - b, t: (a - b) / se };
}

/**
 * Clear: half a step or more, three standard errors apart, which chance rarely makes. Worth
 * watching: two and a half, which it sometimes does. Anything less is no clear gap. A writer
 * has a dozen or so comparisons, so a looser bar would show one made by chance most of the time.
 */
export function strengthOf(gap: number, t: number): Strength {
  if (Math.abs(gap) >= 0.5 && Math.abs(t) >= 3) return "clear";
  if (Math.abs(gap) >= 0.4 && Math.abs(t) >= 2.5) return "maybe";
  return "none";
}

/** Where to split a number's days: at its goal when both sides get enough days, else as evenly as its values allow. */
export function splitAt(values: number[], goal: number | null = null): number | null {
  const above = (at: number) => values.filter((v) => v >= at).length;
  const fits = (at: number) => above(at) >= MIN_SIDE && values.length - above(at) >= MIN_SIDE;
  if (goal && goal > 0 && fits(goal)) return goal;
  let best: number | null = null;
  let off = Infinity;
  for (const at of [...new Set(values)].sort((a, b) => a - b).slice(1)) {
    if (!fits(at)) continue;
    const by = Math.abs(2 * above(at) - values.length);
    if (by < off) [best, off] = [at, by];
  }
  return best;
}

export const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const lower = (s: string) => (/^[A-Z][a-z’']/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/** A number's days on two sides of its split, or none while it has too few or too alike. */
function split(a: Activity): Activity {
  if (a.kind !== "number" || !a.values) return a;
  const at = splitAt(
    a.values.map((v) => v.value),
    a.goal ?? null
  );
  if (at === null) return { ...a, sides: ["", ""], on: {} };
  const n = `${num(at)}${a.unit ? ` ${a.unit}` : ""}`;
  return {
    ...a,
    sides: [`${n} or more`, `Under ${n}`],
    on: Object.fromEntries(a.values.map((v) => [v.day, v.value >= at])),
  };
}

const refOf = ({ key, kind, title, detail, hue, href, sides }: Activity): ActivityRef => ({ key, kind, title, detail, hue, href, sides });

function noteOf(a: Activity, [yes, no]: [number, number]): string {
  if (a.kind === "number" && !a.sides[0]) {
    const logged = a.values?.length ?? 0;
    return logged >= 2 * MIN_SIDE ? "Logged, but about the same each day" : `Logged on ${plural(logged, "day")}`;
  }
  if (a.kind === "number") return `${plural(yes, "day")} at ${lower(a.sides[0])}, ${no} ${lower(a.sides[1])}`;
  return `${yes} ${lower(a.sides[0])}, ${no} ${lower(a.sides[1])}`;
}

/** Every activity against the days' moods and energy: what goes with a clear gap, what doesn't, what can't tell yet. */
export function patternsOf(days: DayOf[], activities: Activity[], from: string, upTo: string): Patterns {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const ready = activities.map(split);
  const found: Pattern[] = [];
  const flat: Pattern[] = [];
  const waiting: Waiting[] = [];
  for (const a of ready) {
    const counts = {} as Record<Outcome, [number, number]>;
    let compared = false;
    for (const outcome of OUTCOMES) {
      const yes: number[] = [];
      const no: number[] = [];
      for (const [day, side] of Object.entries(a.on)) {
        const v = byDay.get(day)?.[outcome];
        if (v !== null && v !== undefined) (side ? yes : no).push(v);
      }
      counts[outcome] = [yes.length, no.length];
      if (yes.length < MIN_SIDE || no.length < MIN_SIDE) continue;
      compared = true;
      const c = compare(yes, no);
      const pattern: Pattern = {
        key: `${a.key}:${outcome}`,
        activity: refOf(a),
        outcome,
        yes: { label: a.sides[0], days: yes.length, average: round(c.yes, 1) },
        no: { label: a.sides[1], days: no.length, average: round(c.no, 1) },
        gap: round(c.gap, 2),
        t: round(c.t, 2),
        strength: strengthOf(c.gap, c.t),
      };
      (pattern.strength === "none" ? flat : found).push(pattern);
    }
    if (compared) continue;
    const days: [number, number] = counts.mood[0] + counts.mood[1] > 0 || !(counts.energy[0] + counts.energy[1]) ? counts.mood : counts.energy;
    // Nothing on a day with a mood at all isn't worth a line yet.
    if (days[0] + days[1] > 0 || (a.kind === "number" && a.values?.length))
      waiting.push({
        key: a.key,
        activity: refOf(a),
        days,
        note: noteOf(a, days),
      });
  }
  const order = { clear: 0, maybe: 1, none: 2 };
  found.sort((x, y) => order[x.strength] - order[y.strength] || Math.abs(y.t) - Math.abs(x.t));
  flat.sort((x, y) => Math.abs(y.t) - Math.abs(x.t));
  waiting.sort((x, y) => y.days[0] + y.days[1] - (x.days[0] + x.days[1]));
  return {
    from,
    upTo,
    moods: days.filter((d) => d.mood !== null).length,
    energies: days.filter((d) => d.energy !== null).length,
    found,
    flat,
    waiting,
    days,
    activities: ready,
  };
}

/** Whether there's enough to say anything: days with a mood, or with an energy level. */
export const enoughDays = (p: Patterns) => p.moods >= MIN_DAYS || p.energies >= MIN_DAYS;

/** Patterns side by side by what they're about, in the order they come: Walk's mood and energy together. */
export function byActivity(patterns: Pattern[]): { activity: ActivityRef; patterns: Pattern[] }[] {
  const groups = new Map<string, { activity: ActivityRef; patterns: Pattern[] }>();
  for (const p of patterns) {
    const g = groups.get(p.activity.key) ?? {
      activity: p.activity,
      patterns: [],
    };
    g.patterns.push(p);
    groups.set(p.activity.key, g);
  }
  return [...groups.values()];
}

// ── In words ─────────────────────────────────────────────────────────────────

/** The two sides as they read in a sentence: "on days you did “Walk”", "on other days". */
export function sidesSaid(a: ActivityRef): [string, string] {
  switch (a.kind) {
    case "habit":
      return [`on days you did “${a.title}”`, "on other days"];
    case "number":
      return [`on days “${a.title}” was ${lower(a.sides[0])}`, `on days it was ${lower(a.sides[1])}`];
    case "yes":
      return [`on days you said yes to “${a.title}”`, "on days you said no"];
    case "tag":
      return [`on days you tagged “${a.title}”`, "on other days you wrote"];
    case "moved":
      return ["on days you moved something forward", "on days you didn’t"];
  }
}

/** One true sentence for a pattern: "Your mood was higher on days you did “Walk”: 4.1 out of 5 on average, against 3.3 on other days." */
export function patternSaid(p: Pattern): string {
  const [on, off] = sidesSaid(p.activity);
  const yes = num(p.yes.average);
  const no = num(p.no.average);
  if (p.strength === "none") return `No clear difference in your ${p.outcome} ${on}: ${yes} on average, against ${no} ${off}.`;
  const way = p.gap > 0 ? "higher" : "lower";
  if (p.strength === "maybe") return `Your ${p.outcome} may be ${way} ${on}: ${yes} on average, against ${no} ${off}. It could still be chance.`;
  return `Your ${p.outcome} was ${way} ${on}: ${yes} out of 5 on average, against ${no} ${off}.`;
}

// "What makes my days better?", "does walking help my mood?": answered by code, like a breakdown.
const PATTERNS_ASKED = new RegExp(
  [
    // "mood patterns", "show me my patterns", "any insights?"
    String.raw`^(?:(?:so|ok(?:ay)?|hey)[,\s]+)?(?:(?:show|give|tell)\s+me\s+)?(?:any|my|the|some)?\s*(?:mood\s+|energy\s+)?(?:patterns?|insights?)(?:\s+(?:so\s+far|lately|yet))?\s*[?.!]*$`,
    String.raw`\b(?:mood|energy)\s+(?:patterns?|insights?|trends?)\b`,
    String.raw`\bpatterns?\s+(?:in|between|with)\s+(?:my\s+)?(?:mood|energy)`,
    // "what makes my days better", "what lifts my mood", "what drains my energy"
    String.raw`\bwhat(?:['’]s|\s+is)?\s+(?:\w+\s+){0,2}?(?:makes?|made|lifts?|helps?|helped|affects?|drains?|gives?|boosts?|improves?|goes\s+with|go\s+with|linked\s+to|good\s+for|bad\s+for)\s+(?:\w+\s+){0,3}?(?:mood|energy|happ(?:y|ier|iest)|better|good\s+days?|best\s+days?|bad\s+days?|tired)\b`,
    // "does walking help my mood", "how does sleep affect my energy"
    String.raw`\b(?:does|do|did|is|are|how\s+does|how\s+do)\s+(?:[\w’']+\s+){1,4}?(?:help|affect|lift|boost|drain|change|improve|hurt|link(?:ed)?\s+to|go\s+with|make\s+a\s+difference\s+to|good\s+for|bad\s+for)\w*\s+(?:to\s+|with\s+)?(?:my\s+)?(?:mood|energy)\b`,
    // "is my mood better when I walk", "am I happier on days I write"
    String.raw`\b(?:is|was|are)\s+(?:my\s+)?(?:mood|energy)\s+(?:any\s+)?(?:better|higher|lower|worse|different)\s+(?:when|on\s+days|after|if)\b`,
    String.raw`\bam\s+i\s+(?:happier|less\s+tired|more\s+tired|in\s+a\s+better\s+mood)\s+(?:when|on\s+days|after|if)\b`,
    String.raw`\bwhen\s+(?:am|was)\s+i\s+(?:happiest|at\s+my\s+best|most\s+tired|in\s+the\s+best\s+mood)\b`,
  ].join("|"),
  "i"
);

export const patternsAsked = (said: string) => PATTERNS_ASKED.test(said);

// Words in a question that say what kind of question it is, not what it's about.
const ASKING = new Set(
  "the and for you your are was did does doesnt how what whats when why who any all can get got has had have been this that with about make makes made help helps affect affects lift lifts boost boosts drain drains give gives happiest happier happy better best good day days mood moods energy really much more less going linked link pattern patterns insight insights tell show there their them they week month lately most least feel feeling tired".split(
    " "
  )
);
const wordsOf = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !ASKING.has(w));
// "walking" is "Walk", "gyms" is "Gym": the same first four letters, or a short word and its longer form.
const near = (a: string, b: string) => (a.length < 4 || b.length < 4 ? a.startsWith(b) || b.startsWith(a) : a.slice(0, 4) === b.slice(0, 4));

/** The activity a question names ("does walking help my mood?" names “Walk”), if one. */
export function namedIn(p: Patterns, said: string): ActivityRef | null {
  const asked = wordsOf(said);
  if (!asked.length) return null;
  let best: { a: ActivityRef; hits: number } | null = null;
  for (const a of p.activities) {
    const hits = wordsOf(`${a.title} ${a.detail}`).filter((w) => asked.some((x) => near(w, x))).length;
    if (hits && (!best || hits > best.hits)) best = { a: refOf(a), hits };
  }
  return best?.a ?? null;
}

/** What Maru says when asked about patterns: the one that answers the question, in a sentence. */
export function patternsReply(p: Patterns, said: string): string {
  if (!enoughDays(p)) {
    const so = p.moods ? `there ${p.moods === 1 ? "is" : "are"} ${p.moods} so far` : "there are none yet";
    return `Not enough days to tell yet: patterns need ${MIN_DAYS} days with a mood, and ${so}. A day gets one when you answer my mood check or the mood on your page.`;
  }
  // Asked about energy, its patterns come first; otherwise mood's.
  const first: Outcome = /\benergy|tired|drain/i.test(said) && !/\bmood|happ/i.test(said) ? "energy" : "mood";
  const prefer = (list: Pattern[]) => [...list].sort((x, y) => Number(x.outcome !== first) - Number(y.outcome !== first));
  const named = namedIn(p, said);
  if (named) {
    const about = prefer([...p.found, ...p.flat]).find((x) => x.activity.key === named.key);
    if (about) return patternSaid(about);
    const waiting = p.waiting.find((w) => w.key === named.key);
    if (waiting) return `Too early to tell for “${named.title}”: ${lower(waiting.note)} so far, and each side needs ${MIN_SIDE} days with a mood.`;
  }
  const top = prefer(p.found.filter((x) => x.strength === "clear"))[0] ?? prefer(p.found)[0];
  if (top) return patternSaid(top);
  if (p.flat.length)
    return `Nothing clear yet: ${plural(new Set(p.flat.map((x) => x.activity.key)).size, "thing")} compared over ${p.moods} days with a mood, and none goes with a clear gap.`;
  return "Nothing to compare yet: patterns come from habits and numbers on your threads, and from yes-or-no questions and tags on your pages.";
}
