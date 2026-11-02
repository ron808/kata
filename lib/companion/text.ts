import type { ThreadKind } from "@/lib/types";

/**
 * Small language helpers so Kata can name a thread mid-sentence ("the payments
 * webhook", "your job hunt", "fixing the login bug") without a model.
 */

/** FNV-1a: the same writer, day and slot always pick the same wording. */
export function seedOf(...parts: (string | number)[]): number {
  const s = parts.join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length];
}

export function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function slugify(s: string, max = 40): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** Numbers as Kata writes them: words up to ten, digits after. */
export function count(n: number): string {
  return Number.isInteger(n) && n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n);
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function trimEnd(s: string): string {
  return s.trim().replace(/[\s.,;:!?]+$/, "");
}

// ── Verbs ────────────────────────────────────────────────────────────────────

/** Verbs that start a to-do whatever follows: "Fix the login bug", "Learn Spanish". */
const SURE_VERBS = new Set(
  `fix finish write ship launch learn apply prepare submit send update migrate refactor deploy publish
  organize organise get make buy renew read study complete implement rewrite redesign debug register pick
  choose decide try quit finalize finalise cancel return sell edit polish wrap follow reach sort figure
  clear reply respond rehearse outline find investigate explore upgrade install configure merge integrate
  add remove delete replace convert port translate document benchmark optimize optimise automate onboard
  clean start stop go practice practise prep draft`.split(/\s+/)
);

/** Verbs aimed at someone: a verb when a name or pronoun follows ("Call Priya", "Email them"). */
const PEOPLE_VERBS = new Set(
  "call email text message meet ask tell visit thank pay invite see ping contact interview hire".split(" ")
);

/** Could be a noun too ("Design system", "Book club"): a verb only before an object word. */
const AMBIGUOUS_VERBS = new Set(
  `design test plan run book review record set move train walk build release close raise file schedule
  list post share open check look track measure sketch prototype pitch work save cut lose gain watch talk
  sign pack print order play shoot film mix sleep eat drink exercise stretch rest wake journal floss`.split(/\s+/)
);

const OBJECT_WORDS = new Set(
  `the a an my our your his her their this that these those some all it them him up out on off in into
  for to back over with through down about around more less better earlier well regularly daily every each
  by before`.split(/\s+/)
);

const PRONOUN_OBJECTS = new Set(["him", "her", "them", "me", "us", "everyone"]);

export function isVerb(word: string): boolean {
  const w = word.toLowerCase();
  return SURE_VERBS.has(w) || PEOPLE_VERBS.has(w) || AMBIGUOUS_VERBS.has(w);
}

/** "Fix the login bug" yes; "Design system", "Payments webhook" no. */
export function isVerbPhrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  if (words.length < 2) return false;
  const first = words[0].toLowerCase();
  const second = words[1];
  if (SURE_VERBS.has(first)) return true;
  if (PEOPLE_VERBS.has(first)) {
    return /^\p{Lu}/u.test(second) || OBJECT_WORDS.has(second.toLowerCase()) || PRONOUN_OBJECTS.has(second.toLowerCase());
  }
  return AMBIGUOUS_VERBS.has(first) && OBJECT_WORDS.has(second.toLowerCase());
}

const GERUNDS: Record<string, string> = {
  be: "being",
  see: "seeing",
  quit: "quitting",
  debug: "debugging",
  submit: "submitting",
  commit: "committing",
  refer: "referring",
  prep: "prepping",
  travel: "traveling",
  cancel: "canceling",
  label: "labeling",
  model: "modeling",
  lie: "lying",
  tie: "tying",
};

function gerund(verb: string): string {
  const v = verb.toLowerCase();
  if (GERUNDS[v]) return GERUNDS[v];
  if (v.endsWith("ie")) return `${v.slice(0, -2)}ying`;
  if (/(?:ee|ye|oe)$/.test(v)) return `${v}ing`;
  if (v.endsWith("e") && v.length > 2) return `${v.slice(0, -1)}ing`;
  // Short consonant-vowel-consonant verbs double the last letter: ship, plan, run.
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(v)) return `${v}${v.slice(-1)}ing`;
  return `${v}ing`;
}

/** "Fix the login bug" → "fixing the login bug". */
export function gerundPhrase(phrase: string): string {
  const [first, ...rest] = phrase.trim().split(/\s+/);
  return [gerund(first), ...rest].join(" ");
}

// ── Naming a thread ──────────────────────────────────────────────────────────

/** Things that belong to the writer, so Kata says "your": your thesis, your job hunt. */
const YOUR_NOUNS = new Set(
  `thesis dissertation portfolio resume résumé cv taxes visa wedding move apartment flat house application
  applications interview interviews exam exams finals internship budget savings training hunt search recovery
  health diet sleep routine novel book blog newsletter podcast garden car career studies degree course classes
  trip vacation holiday renovation startup business shop channel album talk presentation speech birthday knee
  back shoulder neck stomach skin energy anxiety migraines headaches hip ankle wrist injury physio appointment
  commute inbox goals shift rota appointments`.split(/\s+/)
);

/** Single words that read as a thing at work: the launch, the migration, the gym. */
const THE_NOUNS = new Set(
  `gym launch release migration refactor rewrite redesign roadmap deck pitch demo report proposal grant
  fundraise onboarding deadline review audit build deploy deployment website site app api docs documentation
  backlog sprint invoice contract offer beta prototype mvp rollout cleanup outage incident bug feature
  conference meeting party paperwork`.split(/\s+/)
);

/** Activities named bare and lowercase: meditation, running, guitar. */
const BARE_NOUNS = new Set(
  `meditation yoga running reading writing cycling swimming journaling stretching therapy cooking drawing
  painting climbing lifting cardio pilates walking hiking chess coding photography music drums violin guitar
  piano singing dancing boxing surfing tennis football soccer basketball golf baking gardening knitting fasting
  homework revision practice sobriety hydration studying sketching rowing crossfit weights mobility flossing
  prayer budgeting networking outreach recruiting hiring fundraising marketing sales design`.split(/\s+/)
);

const SMALL_WORDS = new Set(["of", "and", "the", "for", "a", "an", "to", "in", "on", "at", "&"]);

/** Sentence starters that are safe to lowercase mid-sentence. Names never are. */
const FUNCTION_WORDS = new Set(
  `the a an my our this that these those it it's its there they we some no not still just need needs waiting
  probably maybe also then next first`.split(/\s+/)
);

function looksProper(word: string): boolean {
  return (
    (word.length > 1 && word === word.toUpperCase() && /\p{Lu}/u.test(word)) ||
    /\d/.test(word) ||
    /\p{Lu}/u.test(word.slice(1))
  );
}

/** Lowercase the first letter of a sentence-case title ("Payments webhook" → "payments webhook"). */
function lowerTitle(s: string): string {
  const first = s.split(/\s+/)[0] ?? "";
  if (looksProper(first) || /^\p{Lu}\p{Ll}*['’]s$/u.test(first)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Lowercase only a leading function word or verb, so names keep their capital ("Priya" stays). */
function softLower(s: string): string {
  const first = (s.split(/\s+/)[0] ?? "").toLowerCase();
  if (FUNCTION_WORDS.has(first) || isVerb(first)) return s.charAt(0).toLowerCase() + s.slice(1);
  return s;
}

export interface Referable {
  title: string;
  kind: ThreadKind;
  log?: { text: string; from: string }[];
}

/** The title as the writer typed it mid-sentence, if they ever did ("the Stripe migration"). */
function writerCasing(t: Referable): string | null {
  if (!t.log?.length) return null;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(t.title)})(?![\\p{L}\\p{N}])`, "iu");
  for (let i = t.log.length - 1; i >= 0; i--) {
    const item = t.log[i];
    if (item.from === "kata") continue;
    const m = re.exec(item.text);
    if (!m) continue;
    const before = item.text.slice(0, m.index + m[1].length).trimEnd();
    if (before && !/[.!?:\n]$/.test(before)) return m[2];
  }
  return null;
}

/** The writer's words in Kata's mouth: "my back is killing me" → "your back is killing you". */
export function yours(s: string): string {
  return s
    .replace(/\bI am\b/g, "you are")
    .replace(/\bI was\b/g, "you were")
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bI've\b/gi, "you've")
    .replace(/\bI'll\b/gi, "you'll")
    .replace(/\bI'd\b/gi, "you'd")
    .replace(/\bI\b/g, "you")
    .replace(/\bmyself\b/gi, "yourself")
    .replace(/\b(?:my|our)\b/gi, "your")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\bme\b/gi, "you");
}

const GERUND_LEAD = /^\p{L}+ing\s+(?:the|a|an|my|our|for|to|about|with|on|up|out|in|into|at|\p{Lu})/u;

/**
 * The thread as a noun phrase for the middle of a sentence: "the payments
 * webhook", "your job hunt", "fixing the login bug", "Priya's birthday", "Kata".
 */
export function ref(t: Referable): string {
  const own = writerCasing(t);
  const title = own ?? t.title;
  const words = title.split(/\s+/);
  const lower = title.toLowerCase();
  if (t.kind === "person") return title;
  if (/^my\s/i.test(title)) return yours(`your ${title.slice(3)}`);
  if (/^\p{L}+['’]s$/u.test(words[0])) return yours(title);
  if (words.length === 1) {
    if (YOUR_NOUNS.has(lower)) return `your ${lower}`;
    if (THE_NOUNS.has(lower)) return `the ${lower}`;
    if (BARE_NOUNS.has(lower) || /^\p{Ll}+ing$/u.test(lower)) return lower;
    return title;
  }
  if (GERUND_LEAD.test(title)) return yours(own ?? lowerTitle(title));
  // "Interview with Stripe" is an event, not "interviewing with Stripe".
  if (t.kind !== "event" && isVerbPhrase(title)) return yours(gerundPhrase(title));
  if (t.kind === "task") return `“${title}”`;
  if (words.every((w) => /^[\p{Lu}\d]/u.test(w) || SMALL_WORDS.has(w))) return title;
  const article = words.some((w) => YOUR_NOUNS.has(w.toLowerCase())) ? "your" : "the";
  return yours(`${article} ${own ?? lowerTitle(title)}`);
}

/** True when ref() gives a gerund ("fixing the login bug"), which can't be the subject of "was stuck". */
export function refIsActivity(t: Referable): boolean {
  const r = ref(t);
  return /^\p{Ll}+ing\b/u.test(r) && !r.startsWith("“");
}

// ── Notes and steps in the writer's words ────────────────────────────────────

const FINITE =
  /\b(?:is|are|was|were|am|be|been|has|have|had|keeps?|kept|needs?|broke|failed|fails|crashed|crashes|says|said|wants?|seems?|got|gets|went|goes|will|would|could|should|might|must|can't|cannot|won't|don't|doesn't|didn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|shouldn't|couldn't|wouldn't|it's|that's|there's|he's|she's|they're|we're|i'm|i've|we've|they've|i'll|it'll)\b/i;

/** A clause ("the staging env is down") rather than a noun phrase ("flaky tests"). */
export function isClause(note: string): boolean {
  return FINITE.test(note);
}

/** A short noun phrase that reads inline: "stuck on flaky tests", "waiting on Priya". Not "ask Priya first". */
export function isShortPhrase(note: string): boolean {
  const first = (note.trim().split(/\s+/)[0] ?? "").toLowerCase();
  return (
    note.split(/\s+/).length <= 6 &&
    !isClause(note) &&
    !/[,;:"“]/.test(note) &&
    !SURE_VERBS.has(first) &&
    !PEOPLE_VERBS.has(first)
  );
}

/** A note set inline in Kata's sentence ("stuck on flaky tests"). Quoted notes stay verbatim. */
export function noteText(note: string): string {
  return yours(softLower(trimEnd(note)));
}

/** A next step for "was to {step}": verb first, lowercase. */
export function stepText(step: string): string {
  return yours(softLower(trimEnd(step)));
}

/** The writer's words for a quote, cut at a word boundary. */
export function quote(s: string, max = 100): string {
  const t = trimEnd(s.replace(/\s+/g, " "));
  if (t.length <= max) return `“${t}”`;
  const cut = t.slice(0, max);
  return `“${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…”`;
}

export function startsWithVerb(phrase: string): boolean {
  return isVerb(phrase.trim().split(/\s+/)[0] ?? "");
}
