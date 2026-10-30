import { threadKey } from "@/lib/db/models/Thread";
import { complete, isGroqConfigured } from "@/lib/ai/groq";
import { parseKataFieldId } from "@/lib/questions/daily";
import type { ThreadKind, ThreadStatus } from "@/lib/types";
import { GroqThreadsSchema } from "./schemas";
import { addDays, dayToDate } from "./time";
import { capFirst, escapeRe, isClause, isVerb, isVerbPhrase, trimEnd } from "./text";

/**
 * Finds the threads in what the writer wrote. Without Groq this is all
 * heuristics, and they are deliberately conservative: a wrong thread is worse
 * than a missed one, so anything vague, long or clause-like is dropped.
 */

export interface ThreadCandidate {
  title: string;
  kind: ThreadKind;
  /** For habits, "done" means it happened today. */
  status: ThreadStatus | null;
  nextStep: string;
  note: string;
  tags: string[];
  dueAt: Date | null;
  /** The writer's sentence it came from. */
  snippet: string;
  /** Set when the text is about a thread Kata already keeps. */
  threadId: string | null;
}

export interface KnownThread {
  _id: string;
  title: string;
  kind: ThreadKind;
}

export interface ExtractOptions {
  known?: KnownThread[];
  /** The writer's local day, for "tomorrow" and weekday names. */
  today?: string;
  /** False: heuristics only, even with a model configured. */
  useAi?: boolean;
}

export interface PageField {
  fieldId: string;
  type: string;
  label: string;
  value: unknown;
}

type FieldHint = "stuck" | "plan" | null;

const MAX_NEW = 6;

// ── Words ────────────────────────────────────────────────────────────────────

/** Titles that name nothing in particular. Compared after a leading "the" or "my" is removed. */
const VAGUE = new Set([
  "it", "this", "that", "them", "these", "those", "stuff", "things", "something", "anything", "everything",
  "nothing", "a lot", "lots", "a bit", "bits", "work", "work stuff", "it all", "the usual", "myself", "me",
  "home", "day", "week", "emails", "email", "admin", "chores", "errands", "meetings", "meeting", "calls",
  "call", "slack", "messages", "tasks", "todo", "todos", "to-dos", "list", "projects", "project",
  "side project", "side projects", "reply", "answer", "news", "feedback", "results", "plan", "plans",
  "sleep", "food", "lunch", "dinner", "breakfast", "coffee", "bed", "rest", "break", "bus", "train",
  "weekend", "bug", "bugs", "issue", "issues", "problem", "problems", "code", "coding", "life",
  "everything else", "hard", "thing", "up", "more", "less", "better", "worse", "progress", "time",
]);

const BAD_START =
  /^(?:i|i'm|im|i've|i'll|me|we|we're|you|he|she|they|it|it's|its|there|here|what|how|why|when|where|who|whether|not|no|so|very|really|just|also|and|or|but|to|of|on|in|at|for|with|about|being|doing|having|any|every|much|many|lots?|more|less|myself|ourselves|yourself|today|tomorrow|tonight|yesterday)\b/i;

const FAMILY = "mom|mum|dad|grandma|grandpa|nan|nana|sister|brother|wife|husband|partner|son|daughter|aunt|uncle|cousin|boss|kids|baby";
const FAMILY_RE = new RegExp(`^(?:${FAMILY})$`, "i");

const EVENT_W =
  /\b(?:interview(?!\s+(?:prep|practice|questions))|birthday|wedding|appointment|exam|exams|finals|deadline|flight|trip|party|anniversary|conference|presentation|demo day|launch day|dinner with|lunch with|call with|recital|concert|graduation|move-in)\b/i;
const HABIT_W = /^(?:gym|running|yoga|meditation|journaling|stretching|walking|cycling|swimming|flossing|lifting|workouts?)$|\b(?:every day|daily|each day|\d+x a week|times a week)\b/i;
const LEARN_W =
  /^(?:learning|studying|practicing|practising)\b|\b(?:course|class|lessons?|spanish|french|german|japanese|mandarin|italian|portuguese|korean|arabic|hindi|guitar|piano|violin|drums|chess|calculus|algebra|statistics|physics|chemistry|biology|gre|gmat|lsat|mcat|ielts|toefl)\b/i;
const HEALTH_W =
  /\b(?:health|knee|back pain|shoulder|injury|therapy|physio|doctor|diet|eat|eating|recovery|sleep|weight|blood pressure|meds|medication|anxiety|sobriety|dentist)\b/i;
const GOAL_W =
  /\b(?:job hunt|job search|promotion|savings|get fit|fluent|fluency|degree|marathon|half marathon|10k|5k|fundrais\w*|debt|career change)\b/i;

export function guessKind(title: string, fallback?: ThreadKind): ThreadKind {
  if (EVENT_W.test(title)) return "event";
  if (HABIT_W.test(title)) return "habit";
  if (LEARN_W.test(title)) return "learning";
  if (HEALTH_W.test(title)) return "health";
  if (GOAL_W.test(title)) return "goal";
  if (FAMILY_RE.test(title)) return "person";
  if (fallback) return fallback;
  return isVerbPhrase(title) ? "task" : "project";
}

/** Things worth tracking on their own while you wait for them: a visa, an offer. A review or a reply is not. */
const AWAITABLE =
  /\b(?:visa|offer|contract|invoice|payment|refund|package|parcel|delivery|keys|permit|licen[cs]e|loan|mortgage|quote|estimate|grades|acceptance|admission|diagnosis|paperwork|passport|background check|references|transcript|funding|term sheet)\b/i;
const NAME = /^\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?$/u;
const NOT_NAMES = /^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|slack|email|today|tomorrow)$/i;

// ── Cleaning ─────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[ \t]+/g, " ");
}

const TRAILING =
  /\s+(?:today|tonight|tomorrow|yesterday|this (?:morning|afternoon|evening|week|month|weekend)|next (?:week|month)|last (?:night|week)|all (?:day|morning|afternoon|evening|week)|in the (?:morning|afternoon|evening)|at night|again|now|right now|lately|at the moment|for now|later|soon|first|already|anymore|any more|too|as well|properly|finally|for (?:a bit|a while|ages|hours|an hour|a few (?:hours|days|minutes)|\d+\s*(?:h|hrs?|hours?|mins?|minutes?|days?|weeks?))|(?:on|by|this) (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|eod|the weekend)|by (?:end of (?:day|week)))$/i;

/** The noun phrase at the start of `tail`, cut at the first clause boundary or time phrase. */
function takePhrase(tail: string, keepFrom = false): string {
  let s = tail.split(/[,.;:!?()[\]"]|\s[-–—]\s/)[0];
  const cut = keepFrom
    ? /\s+(?:because|since|so that|so|but|which|who|when|while|until|till|unless|although|though|whereas|if|once|and then|then|before|after|instead|at|via|using)\b/i
    : /\s+(?:because|since|so that|so|but|which|who|when|while|until|till|unless|although|though|whereas|if|once|and then|then|before|after|instead|at|with|via|from|using)\b/i;
  s = s.split(cut)[0];
  s = s.split(/\s+and\s+(?=(?:i|i'm|i've|i'll|we|it|it's|they|then|also|still|now|later|need|have|got)\b)/i)[0];
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(TRAILING, "");
  }
  return s.trim();
}

/** A thread title, or null when the phrase is too vague, too long or not a thing. */
function cleanTitle(phrase: string): string | null {
  let s = phrase.trim().replace(/^["'*_]+|["'*_]+$/g, "");
  s = s.replace(/^(?:the|a|an|this|that|these|those|some|our|his|her|their|your)\s+/i, "");
  s = s.replace(new RegExp(`^my\\s+(?!(?:${FAMILY}|friend)\\b)`, "i"), "");
  s = s.replace(/\s+(?:stuff|things|bits|thing)$/i, "");
  s = trimEnd(s);
  if (s.length < 2 || s.length > 60) return null;
  if (s.split(/\s+/).length > 6) return null;
  if (VAGUE.has(s.toLowerCase()) || BAD_START.test(s) || isClause(s) || /^\d+$/.test(s)) return null;
  return capFirst(s);
}

// ── Status words ─────────────────────────────────────────────────────────────

const DONE_RE =
  /\b(?:shipped|finished|completed|landed|launched|released|submitted|merged|deployed|published|delivered|wrapped up|went live|(?:is|are|was|got|all) done|done with|is live|closed out)\b/i;
const PAUSED_RE = /\b(?:paused|on hold|on pause|shelved|parked|put (?:it )?aside|gave up on|giving up on)\b/i;
const WAITING_RE =
  /\b(?:waiting (?:on|for)|still waiting|in review|under review|up for review|out for review|awaiting|pending (?:review|approval|sign-?off)|sent (?:\w+ )?(?:off )?for review)\b/i;
const STUCK_RE = /\b(?:stuck|blocked|stalled|can't figure out|cannot figure out|going nowhere|hit a wall)\b/i;
const MOVING_RE =
  /\b(?:working on|started on|made progress|making progress|progress on|unblocked|unstuck|no longer (?:stuck|blocked)|back on|picked (?:it |\w+ )?(?:back )?up|kicked off|moving again|underway)\b/i;
const NEGATED =
  /\b(?:not|never|no longer|almost|nearly|yet to|close to|about to|will|won't|going to|gonna|plan(?:ning)? to|hop(?:e|ing) to|need to|have to|want to|tr(?:y|ying) to|should|didn't|haven't|hasn't|isn't|wasn't|aren't|weren't|hadn't|couldn't)\b[^,]*$/i;

function said(re: RegExp, clause: string): boolean {
  const m = re.exec(clause);
  return Boolean(m && !NEGATED.test(clause.slice(0, m.index)));
}

/** The status a clause states, if any. Later and stronger words win: done, paused, waiting, stuck, moving. */
export function statusIn(clause: string): ThreadStatus | null {
  if (said(DONE_RE, clause)) return "done";
  if (said(PAUSED_RE, clause)) return "paused";
  if (said(WAITING_RE, clause)) return "waiting";
  if (/\b(?:unblocked|unstuck|no longer (?:stuck|blocked))\b/i.test(clause)) return "moving";
  if (said(STUCK_RE, clause)) return "stuck";
  if (said(MOVING_RE, clause)) return "moving";
  return null;
}

// ── Dates ────────────────────────────────────────────────────────────────────

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** An upcoming day named in the sentence ("tomorrow", "on Friday", "Nov 12"), or null. */
function parseDay(sentence: string, today?: string): string | null {
  if (!today) return null;
  const t = sentence.toLowerCase();
  if (/\b(?:had|was|were|went|did|yesterday|last)\b/.test(t)) return null;
  if (/\b(?:today|tonight|this (?:morning|afternoon|evening))\b/.test(t)) return today;
  if (/\btomorrow\b/.test(t)) return addDays(today, 1);
  const wd = /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(t);
  if (wd && !wd[1]) {
    const diff = (WEEKDAYS.indexOf(wd[2]) - dayToDate(today).getUTCDay() + 7) % 7;
    return diff === 0 ? null : addDays(today, diff);
  }
  const md =
    new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t) ??
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTHS})\\b`).exec(t);
  if (!md) return null;
  const [monthWord, dayNum] = /^\d/.test(md[1]) ? [md[2], Number(md[1])] : [md[1], Number(md[2])];
  const month = MONTH_KEYS.indexOf(monthWord.slice(0, 3));
  if (month < 0 || dayNum < 1 || dayNum > 31) return null;
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const d = new Date(Date.UTC(y, month, dayNum));
    if (d.getUTCMonth() !== month) return null;
    const iso = d.toISOString().slice(0, 10);
    if (iso >= addDays(today, -2)) return iso;
  }
  return null;
}

// ── Patterns ─────────────────────────────────────────────────────────────────

interface Hit {
  title: string;
  kind?: ThreadKind;
  status?: ThreadStatus | null;
  note?: string;
  tags?: string[];
  /** Other spellings of the same thing, so "Stripe interview" finds "Interview at Stripe". */
  aliases?: string[];
  /**
   * What another thread in the sentence is waiting on or stuck on ("waiting on
   * Priya"): its note when there is one, a thread of its own only when alone.
   */
  object?: string;
  /** A status for whatever "it" is in the sentence ("it's blocked by legal"); dropped when there's nothing to attach to. */
  pronoun?: boolean;
}

type Subject = { thing: string } | "self" | "pronoun" | null;

const AUX_TAIL =
  /\s*\b(?:is|are|was|were|am|has been|have been|had been|been|still|currently|now|just|really|kind of|kinda|a bit|totally|completely)\s*$/i;

/** Who or what is waiting or stuck: a thing ("the deploy"), the writer ("I'm"), or "it". */
function subjectOf(before: string): Subject {
  let s = before
    .replace(/^.*\b(?:and|but|so|then|because|while)\s+/i, "")
    .replace(/^(?:today|yesterday|this (?:morning|week|afternoon|evening)|so far|right now|currently|now|still|also)\s*,?\s*/i, "");
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(AUX_TAIL, "").trim();
  }
  if (!s || /^(?:i|i'm|im|i am|we|we're|we are|me|us|been)$/i.test(s)) return "self";
  if (/^(?:it|it's|its|this|this is|that|that's|they|they're|they are|he|he's|she|she's)$/i.test(s)) return "pronoun";
  const thing = cleanTitle(s.replace(/'s$|'re$/i, ""));
  return thing ? { thing } : null;
}

function nameAt(tail: string): string | null {
  const m = /^((?:the\s+)?\p{Lu}[\p{L}\d&.'-]*(?:\s+\p{Lu}[\p{L}\d&.'-]*){0,3})/u.exec(tail.trim());
  if (m) return m[1].replace(/^the\s+/, "");
  const phrase = takePhrase(tail);
  return phrase && phrase.split(/\s+/).length <= 4 ? phrase : null;
}

/** "waiting on Priya to review it" → Priya. */
function waitedOn(tail: string): string {
  return takePhrase(tail, true).split(/\s+to\s+(?=[a-z])/)[0].trim();
}

/** "Waiting on X" with no thing before it: X may be worth tracking itself (a visa, a person), or just another thread's note. */
function waitingHit(object: string): Hit {
  if (NAME.test(object) && !NOT_NAMES.test(object)) return { title: object, kind: "person", status: "waiting", object };
  const title = AWAITABLE.test(object) ? cleanTitle(object) : null;
  return title ? { title, kind: "other", status: "waiting", object } : { title: "", status: "waiting", note: object, pronoun: true };
}

function hitsIn(clause: string): Hit[] {
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;

  if ((m = /\b(?:working|worked|work|focus(?:ing|ed)?|start(?:ed|ing)?)\s+on\s+(.+)/i.exec(clause))) {
    const title = cleanTitle(takePhrase(m[1]));
    if (title) hits.push({ title, status: statusIn(clause) ?? "moving" });
  }

  if ((m = /\b(?:finish|finishing|wrap up|wrapping up|complete|completing)\s+(.+)/i.exec(clause))) {
    const title = cleanTitle(takePhrase(m[1]));
    if (title) hits.push({ title, status: statusIn(clause) ?? "moving" });
  } else if ((m = /\b(?:finished|completed|wrapped up|shipped|launched|released|submitted|merged|deployed|published)\s+(.+)/i.exec(clause))) {
    const title = cleanTitle(takePhrase(m[1]));
    if (title && !NEGATED.test(clause.slice(0, m.index))) hits.push({ title, status: "done" });
  }

  if ((m = /\b(?:need to|needs to|have to|has to|got to|gotta|must)\s+(.+)/i.exec(clause))) {
    const negated = /\b(?:don't|do not|didn't|no|won't|never)\s+(?:\w+\s+)?$/i.test(clause.slice(0, m.index));
    const phrase = takePhrase(m[1]).replace(/^(?:remember to|try to|really|also|still|probably|finally|actually|just)\s+/i, "");
    const verb = phrase.split(/\s+/)[0]?.toLowerCase() ?? "";
    const handledElsewhere =
      /^(?:work|finish|complete|wrap|study|learn|practice|practise|revise|be|do|remember|think|stop)$/.test(verb) ||
      /^(?:start|begin)\s+(?:working|on)\b/i.test(phrase) ||
      /\b(?:gym|run|yoga|meditat\w*)\b/i.test(phrase);
    if (!negated && !handledElsewhere && isVerb(verb) && phrase.split(/\s+/).length >= 2) {
      const title = cleanTitle(phrase);
      if (title) hits.push({ title, kind: "task", status: "moving" });
    }
  }

  if ((m = /^(.*?)\b(?:waiting|waited)\s+(?:on|for)\s+(.+)$/i.exec(clause))) {
    const subject = subjectOf(m[1]);
    const object = waitedOn(m[2]);
    if (subject && typeof subject === "object") hits.push({ title: subject.thing, status: "waiting", note: object });
    else if (subject === "pronoun") hits.push({ title: "", status: "waiting", note: object, pronoun: true });
    else if (subject === "self" && object) hits.push(waitingHit(object));
  } else if ((m = /^(.+?)\s+(?:is|are|was|'s)\s+(?:still\s+)?(?:in review|under review|up for review|out for review|pending(?: review| approval)?)\b/i.exec(clause))) {
    const subject = subjectOf(m[1]);
    if (subject && typeof subject === "object") hits.push({ title: subject.thing, status: "waiting", note: "review" });
    else if (subject === "pronoun") hits.push({ title: "", status: "waiting", note: "review", pronoun: true });
  }

  if ((m = /^(.*?)\b(?:stuck|blocked)\s+(on|with|by)\s+(.+)$/i.exec(clause))) {
    const subject = subjectOf(m[1]);
    const object = takePhrase(m[3], true);
    const by = m[2].toLowerCase() === "by";
    if (subject && typeof subject === "object") hits.push({ title: subject.thing, status: "stuck", note: object });
    else if (subject === "pronoun" || (subject === "self" && by)) hits.push({ title: "", status: "stuck", note: object, pronoun: true });
    else if (subject === "self") {
      const title = cleanTitle(object);
      if (title) hits.push({ title, status: "stuck", object });
    }
  } else if ((m = /^(.+?)\s+(?:is|are|was|were|'s|got|has been|have been|keeps? getting)\s+(?:still\s+|completely\s+|totally\s+|a bit\s+|kind of\s+|kinda\s+|really\s+)?(?:stuck|blocked|stalled)\b/i.exec(clause))) {
    const subject = subjectOf(m[1]);
    if (subject && typeof subject === "object") hits.push({ title: subject.thing, status: "stuck" });
    else if (subject === "pronoun") hits.push({ title: "", status: "stuck", pronoun: true });
  }

  if ((m = /\binterview(?:s|ing)?\s+(with|at|for)\s+(.+)/i.exec(clause))) {
    const name = nameAt(m[2]);
    const title = name ? cleanTitle(`Interview ${m[1].toLowerCase()} ${name}`) : null;
    if (name && title) {
      const happened = /\b(?:had|did|finished|nailed|survived|went (?:well|badly|ok|okay|fine|great))\b/i.test(clause);
      hits.push({
        title,
        kind: "event",
        status: happened ? "done" : null,
        aliases: [`interview with ${name}`, `interview at ${name}`, `${name} interview`],
      });
    }
  } else if ((m = /\b((?:\p{Lu}[\p{L}\d&.-]*\s+){1,3})interview\b/u.exec(clause))) {
    const name = m[1].trim();
    // A single capitalised word at the start of a sentence may just be sentence case ("Big interview").
    const sentenceCase = m.index === 0 && !name.includes(" ") && !/^\p{Lu}{2,}$/u.test(name);
    if (!sentenceCase && !NOT_NAMES.test(name) && name.toLowerCase() !== "the") {
      const happened = /\b(?:had|did|finished|nailed|survived|went (?:well|badly|ok|okay|fine|great))\b/i.test(clause);
      hits.push({
        title: `${name} interview`,
        kind: "event",
        status: happened ? "done" : null,
        aliases: [`interview with ${name}`, `interview at ${name}`, `${name} interview`],
      });
    }
  }

  if ((m = new RegExp(`\\b((?:my\\s+)?(?:${FAMILY}))'s\\s+birthday\\b`, "i").exec(clause) ??
      /\b(\p{Lu}\p{Ll}+)'s\s+birthday\b/u.exec(clause))) {
    const owner = m[1].toLowerCase().startsWith("my ") ? `My ${m[1].slice(3).toLowerCase()}` : capFirst(m[1]);
    if (!NOT_NAMES.test(owner)) hits.push({ title: `${owner}'s birthday`, kind: "event" });
  }

  const habit = habitIn(clause);
  if (habit) hits.push(habit);

  // "my sleep has been bad", "my knee is playing up": a health thread that isn't going well.
  if ((m = HEALTH_STATE.exec(clause))) {
    hits.push({ title: capFirst(m[1].toLowerCase()), kind: "health", status: "stuck", note: trimEnd(clause.slice(m.index)).slice(0, 280) });
  }

  if ((m = /\b(study|studied|studying|revise|revised|revising|learn|learning|practi[cs]e|practi[cs]ed|practi[cs]ing)\s+(for\s+)?(.+)/i.exec(clause))) {
    const asNoun = /\b(?:the|a|an|my|our|steep|of)\s+$/i.test(clause.slice(0, m.index));
    const x = takePhrase(m[3]);
    const object = cleanTitle(x);
    if (!asNoun && object && !/^(?:that|how|what|why|a lot|lots|so much|more|about)\b/i.test(x)) {
      const verb = m[1].toLowerCase();
      const lead = /^(?:stud|revis)/.test(verb) ? "Studying" : verb.startsWith("learn") ? "Learning" : "Practicing";
      const title = cleanTitle(`${lead} ${m[2] ? "for " : ""}${x.replace(/^my\s+/i, "")}`);
      if (title) hits.push({ title, kind: "learning", status: "moving" });
    }
  }

  return hits;
}

const HABIT_NEGATED = /\b(?:skipped|skip|missed|no|didn't|couldn't|won't|not|never|will|going to|gonna|need to|plan to|tomorrow|later)\b/i;

const HEALTH_STATE =
  /\b(?:my\s+)?(sleep|back|knee|shoulder|neck|stomach|skin|energy|anxiety|migraines?|headaches?|hip|ankle|wrist)\s+(?:has been|have been|is|are|was|were|'s|feels?|felt|keeps?)\s+(?:really\s+|so\s+|pretty\s+|very\s+|kind of\s+|a bit\s+|still\s+)?(?:bad|terrible|awful|rough|poor|off|worse|a mess|not great|not good|killing me|playing up|acting up|sore|painful|hurting|flaring up)\b/i;

/** Line labels that aren't threads: "Wins: …", "Note: …". */
const LABELS = new Set(
  `note notes update updates win wins blocker blockers goal goals todo to-do plan plans next mood energy ps edit
  summary highlights lowlights lessons gratitude thanks reminder idea ideas question questions thoughts
  feeling feelings status done shipped tldr fyi nb re`.split(/\s+/)
);

/** "Job hunt: Stripe wrote back." A short noun phrase before a colon or dash names the thread; the rest is its news. */
function topicOf(sentence: string): Hit | null {
  const m = /^(?:also|and|then|plus|re|on|about|update on)?\s*([^:–—]{2,40}?)\s*(?::|\s[-–—])\s+(.+)$/i.exec(sentence);
  if (!m || m[1].split(/\s+/).length > 4) return null;
  if (/\b(?:today|tonight|tomorrow|yesterday|week|weekend|morning|afternoon|evening)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i.test(m[1])) return null;
  const title = cleanTitle(m[1]);
  if (!title || LABELS.has(title.toLowerCase().split(/\s+/)[0])) return null;
  const rest = trimEnd(m[2]);
  return { title, status: statusIn(rest), note: rest.slice(0, 280) };
}

/** Gym, a run, yoga, meditation. "done" only for a plain past-tense report. */
function habitIn(clause: string): Hit | null {
  const run =
    /\b(?:went for|go for|going for|did|had)\s+(?:a|my)\s+(?:(?:quick|short|long|easy|slow|morning|evening|lunch|\d+(?:\.\d+)?\s?(?:k|km|mi|miles?))\s+)*run\b|\bran\s+\d+(?:\.\d+)?\s?(?:k|km|mi|miles?)\b|\bwent running\b|\b(?:morning|evening|long|tempo|easy)\s+run\b/i;
  const found: [RegExp, string, RegExp][] = [
    [/\bgym\b/i, "Gym", /\b(?:went to|hit|did|finished|got to|made it to|back from|after)\s+(?:the\s+)?gym\b|\bgym\s+(?:session\s+)?(?:was|this morning|earlier)\b/i],
    [run, "Running", /\b(?:went|did|had|ran|finished|back from)\b/i],
    [/\byoga\b/i, "Yoga", /\b(?:did|went to|had|finished|back from)\b[^.]*\byoga\b/i],
    [/\bmeditat(?:e|ed|ing|ion)\b/i, "Meditation", /\b(?:meditated|did\s+(?:my\s+|some\s+|a\s+)?meditation)\b/i],
  ];
  for (const [mention, title, didIt] of found) {
    if (!mention.test(clause)) continue;
    const done = didIt.test(clause) && !HABIT_NEGATED.test(clause);
    return { title, kind: "habit", status: done ? "done" : null };
  }
  return null;
}

// ── Known threads ────────────────────────────────────────────────────────────

const GENERIC_HEADS = new Set(
  "page app project work thing stuff plan list email emails call calls meeting meetings site update review notes doc docs".split(" ")
);

interface Mention {
  thread: KnownThread;
  index: number;
  length: number;
}

function mentionsIn(sentence: string, known: KnownThread[]): Mention[] {
  const out: Mention[] = [];
  const heads = new Map<string, KnownThread[]>();
  for (const k of known) {
    const words = k.title.split(/\s+/);
    if (words.length > 1) {
      const head = words[words.length - 1].toLowerCase();
      if (head.length >= 5 && !GENERIC_HEADS.has(head)) heads.set(head, [...(heads.get(head) ?? []), k]);
    }
  }
  for (const k of known) {
    if (k.title.length < 3) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(k.title)})(?![\\p{L}\\p{N}])`, "iu");
    const m = re.exec(sentence);
    if (m) out.push({ thread: k, index: m.index + m[1].length, length: m[2].length });
  }
  for (const [head, threads] of heads) {
    if (threads.length !== 1 || out.some((o) => o.thread._id === threads[0]._id)) continue;
    const m = new RegExp(`\\b(?:the|my|our)\\s+(${escapeRe(head)})\\b`, "i").exec(sentence);
    if (m && !out.some((o) => m.index >= o.index && m.index < o.index + o.length)) {
      out.push({ thread: threads[0], index: m.index, length: m[0].length });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Ids of the known threads a text names. */
export function threadsMentioned(text: string, known: KnownThread[]): string[] {
  return Array.from(new Set(sentencesOf(text).flatMap((s) => mentionsIn(s, known).map((m) => m.thread._id))));
}

/** The known thread a title refers to: same key, an alias, contains it, or its distinctive last word. */
function resolveKnown(title: string, aliases: string[], known: KnownThread[]): KnownThread | null {
  const keys = new Set([threadKey(title), ...aliases.map(threadKey)]);
  const exact = known.find((k) => keys.has(threadKey(k.title)));
  if (exact) return exact;
  const lower = title.toLowerCase();
  const containing = known.filter((k) => k.title.length >= 4 && new RegExp(`\\b${escapeRe(k.title.toLowerCase())}\\b`).test(lower));
  if (containing.length === 1) return containing[0];
  // "Webhook PR from Sam" is the payments webhook, if no other thread ends in "webhook".
  const words = new Set(lower.split(/\s+/));
  const byHead = known.filter((k) => {
    const parts = k.title.toLowerCase().split(/\s+/);
    const head = parts[parts.length - 1];
    return parts.length > 1 && head.length >= 5 && !GENERIC_HEADS.has(head) && words.has(head);
  });
  return byHead.length === 1 ? byHead[0] : null;
}

// ── Assembly ─────────────────────────────────────────────────────────────────

function sentencesOf(text: string): string[] {
  return normalize(text)
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter((s) => s.length >= 3);
}

const CLAUSE_SPLIT =
  /\s*;\s*|\s*,?\s+(?:but|whereas|although|though)\s+|,\s+(?:and|then|so|while)\s+|,\s+(?=(?:it|it's|its|i|i'm|i've|we|we're|they|they're|he|she|that's|this)\b)|\s+and\s+(?=(?:i|i'm|i've|i'll|we|we're|it|it's|they|then|also|still|now|later|waiting|working|stuck|blocked|need|needs|have|has|got|finished|shipped|started|landed|merged)\b)/i;

function clausesOf(sentence: string): string[] {
  return sentence.split(CLAUSE_SPLIT).map((c) => c.trim()).filter(Boolean);
}

function candidate(partial: Partial<ThreadCandidate> & { title: string; snippet: string }): ThreadCandidate {
  return {
    kind: guessKind(partial.title),
    status: null,
    nextStep: "",
    note: "",
    tags: [],
    dueAt: null,
    threadId: null,
    ...partial,
  };
}

function fromHit(hit: Hit, sentence: string, opts: ExtractOptions): ThreadCandidate | null {
  const known = resolveKnown(hit.title, hit.aliases ?? [], opts.known ?? []);
  const day = parseDay(sentence, opts.today);
  if (known) {
    return candidate({
      title: known.title,
      kind: known.kind,
      status: hit.status ?? null,
      note: hit.note ?? "",
      snippet: sentence,
      dueAt: known.kind === "event" && day ? dayToDate(day) : null,
      threadId: known._id,
    });
  }
  // A thing that's already finished isn't worth starting to track.
  if (hit.status === "done" && hit.kind !== "habit") return null;
  const kind = hit.kind ?? guessKind(hit.title);
  return candidate({
    title: hit.title,
    kind,
    status: hit.status ?? null,
    note: hit.note ?? "",
    tags: hit.tags ?? [],
    snippet: sentence,
    dueAt: kind === "event" && day ? dayToDate(day) : null,
  });
}

/** Removes the thread's name from a plan line: "Add retries to the payments webhook" → "Add retries". */
function stepFrom(sentence: string, mention: Mention): string {
  const rest = `${sentence.slice(0, mention.index)} ${sentence.slice(mention.index + mention.length)}`
    .replace(/\b(?:the|my|our)\s*$/i, "")
    .replace(/^\s*[:\-–—]\s*/, "")
    .replace(/\s+(?:on|for|to|in|of|with|the|my|our)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return rest.split(/\s+/).length >= 2 ? trimEnd(rest).slice(0, 140) : "";
}

function heuristicThreads(text: string, opts: ExtractOptions, hint: FieldHint = null): ThreadCandidate[] {
  const out: ThreadCandidate[] = [];
  const known = opts.known ?? [];
  for (const sentence of sentencesOf(text)) {
    const strong: ThreadCandidate[] = [];
    const objects: Hit[] = [];
    const statuses: Hit[] = [];
    const topic = topicOf(sentence);
    if (topic) {
      const c = fromHit(topic, sentence, opts);
      if (c) strong.push(c);
    }
    for (const clause of clausesOf(sentence)) {
      for (const hit of hitsIn(clause)) {
        if (hit.pronoun) statuses.push(hit);
        else if (hit.object && !resolveKnown(hit.title, [], known)) objects.push(hit);
        else {
          const c = fromHit(hit, sentence, opts);
          if (c) strong.push(c);
        }
      }
    }
    for (const mention of mentionsIn(sentence, known)) {
      const named = sentence.slice(mention.index, mention.index + mention.length).toLowerCase();
      const clause = clausesOf(sentence).find((c) => c.toLowerCase().includes(named)) ?? sentence;
      const status = statusIn(clause) ?? (hint === "stuck" ? "stuck" : null);
      const day = parseDay(sentence, opts.today);
      strong.push(
        candidate({
          title: mention.thread.title,
          kind: mention.thread.kind,
          status: mention.thread.kind === "habit" ? habitIn(clause)?.status ?? null : status,
          note: hint === "stuck" && status === "stuck" ? trimEnd(sentence).slice(0, 280) : "",
          nextStep: hint === "plan" ? stepFrom(sentence, mention) : "",
          snippet: sentence,
          dueAt: mention.thread.kind === "event" && day ? dayToDate(day) : null,
          threadId: mention.thread._id,
        })
      );
    }

    // "…, it's waiting on Priya": the status belongs to the thing the sentence is about.
    const target = strong.find((c) => c.kind !== "habit");
    if (target) {
      const key = target.threadId ?? threadKey(target.title);
      const same = strong.filter((c) => (c.threadId ?? threadKey(c.title)) === key);
      for (const s of [...statuses, ...objects.map((o) => ({ ...o, note: o.object }))]) {
        for (const c of same) {
          c.status = s.status ?? c.status;
          if (s.note) c.note = s.note;
        }
      }
    } else {
      for (const o of objects) {
        const c = fromHit(o, sentence, opts);
        if (c) strong.push(c);
      }
    }
    out.push(...strong);
  }
  return out;
}

function hashtagCandidates(text: string, opts: ExtractOptions): ThreadCandidate[] {
  const out: ThreadCandidate[] = [];
  for (const m of normalize(text).matchAll(/(?:^|\s)#([A-Za-z][\w-]{1,40})/g)) {
    const tag = m[1].toLowerCase();
    if (/^[0-9a-f]{3,8}$/.test(tag)) continue;
    const words = m[1].replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").trim();
    const title = cleanTitle(words.split(/\s+/).map((w, i) => (i === 0 ? w : /^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(" "));
    if (!title) continue;
    const sentence = sentencesOf(text).find((s) => s.includes(`#${m[1]}`)) ?? "";
    // A one-word tag that's part of exactly one thread's name tags that thread (#payments → Payments webhook).
    const partOf = (opts.known ?? []).filter((k) => k.title.toLowerCase().split(/\s+/).includes(tag));
    const known = resolveKnown(title, [], opts.known ?? []) ?? (partOf.length === 1 ? partOf[0] : null);
    out.push(
      candidate({
        title: known?.title ?? title,
        kind: known?.kind ?? guessKind(title),
        status: statusIn(sentence.replace(`#${m[1]}`, "")),
        tags: [tag],
        snippet: sentence || `#${m[1]}`,
        threadId: known?._id ?? null,
      })
    );
  }
  return out.filter((c) => c.threadId || c.status !== "done");
}

/** Merges candidates for the same thread (later mentions win on status) and caps new ones. */
function mergeAll(list: ThreadCandidate[]): ThreadCandidate[] {
  const byKey = new Map<string, ThreadCandidate>();
  for (const c of list) {
    const key = c.threadId ?? threadKey(c.title);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...c });
      continue;
    }
    byKey.set(key, {
      ...prev,
      status: c.status ?? prev.status,
      note: c.note || prev.note,
      nextStep: c.nextStep || prev.nextStep,
      tags: Array.from(new Set([...prev.tags, ...c.tags])),
      dueAt: c.dueAt ?? prev.dueAt,
      threadId: prev.threadId ?? c.threadId,
    });
  }
  const merged = [...byKey.values()];
  const known = merged.filter((c) => c.threadId);
  const fresh = merged.filter((c) => !c.threadId).slice(0, MAX_NEW);
  return [...known, ...fresh];
}

// ── Groq ─────────────────────────────────────────────────────────────────────

function extractPrompt(known: KnownThread[]): string {
  const list = known.length ? known.map((k) => `- ${k.title}`).join("\n") : "(none yet)";
  return `You read a person's journal or chat message and list the ongoing things they are working on or tracking: projects, tasks, goals, habits, upcoming events, people they're waiting on.

Return JSON only: {"threads":[{"title":"...","kind":"project|task|goal|habit|person|event|health|learning|other","status":"moving|stuck|waiting|done|paused"|null,"nextStep":"","note":""}]}

Rules:
- Only include things the text clearly states. Never guess. If nothing qualifies, return {"threads":[]}.
- title: 1 to 6 words, the writer's own words, no leading "the" or "my", sentence case.
- status: only when the text says so (blocked or stuck: stuck; waiting or in review: waiting; shipped, done, finished, landed: done). Otherwise null.
- nextStep: the next action if the text names one, else "".
- note: for stuck or waiting, what it's stuck on or waiting on, in the writer's words; else "".
- For a habit done today (went to the gym, went for a run), use status "done".
- At most 5 threads.
- When the text is about one of these existing threads, use its exact title:
${list}`;
}

async function groqThreads(text: string, opts: ExtractOptions): Promise<ThreadCandidate[] | null> {
  try {
    const completion = await complete(
      {
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: extractPrompt(opts.known ?? []) },
          { role: "user", content: text.slice(0, 6000) },
        ],
      },
      { timeout: 6000 }
    );
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = GroqThreadsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const sentences = sentencesOf(text);
    return parsed.data.threads.flatMap((t) => {
      const title = cleanTitle(t.title);
      if (!title) return [];
      const sentence = sentences.find((s) => s.toLowerCase().includes(title.toLowerCase())) ?? "";
      const c = fromHit(
        { title, kind: t.kind, status: t.status, note: t.note.trim() },
        sentence || text.slice(0, 280),
        opts
      );
      return c ? [{ ...c, nextStep: t.nextStep.trim().slice(0, 140) }] : [];
    });
  } catch {
    return null;
  }
}

// ── Public ───────────────────────────────────────────────────────────────────

/** Threads in a free-text message: Groq when configured, the heuristics otherwise or on any failure. */
export async function threadsFromText(text: string, opts: ExtractOptions = {}): Promise<ThreadCandidate[]> {
  const ai = isGroqConfigured() && opts.useAi !== false ? await groqThreads(text, opts) : null;
  return mergeAll([...hashtagCandidates(text, opts), ...(ai ?? heuristicThreads(text, opts))]);
}

const TRACKED_TAG_FIELD = /project|focus|working|goal|task|thread|track|habit|course|subject|client|area/i;

function hintFor(label: string): FieldHint {
  if (/block|stuck|in the way|obstacle|struggl/i.test(label)) return "stuck";
  if (/tomorrow|plan|next|to-?do|priorit/i.test(label)) return "plan";
  return null;
}

/** Threads on a saved page: tag fields that name projects, hashtags, phrases, and answers to Kata's questions. */
export async function threadsFromEntry(entry: { fields: PageField[] }, opts: ExtractOptions = {}): Promise<ThreadCandidate[]> {
  const known = opts.known ?? [];
  const out: ThreadCandidate[] = [];
  const texts: { label: string; text: string; hint: FieldHint }[] = [];

  for (const f of entry.fields) {
    if (f.type === "tags" && Array.isArray(f.value)) {
      if (!TRACKED_TAG_FIELD.test(f.label)) continue;
      for (const v of f.value) {
        if (typeof v !== "string") continue;
        const title = cleanTitle(v);
        if (!title) continue;
        const k = resolveKnown(title, [], known);
        out.push(
          candidate({
            title: k?.title ?? title,
            kind: k?.kind ?? guessKind(title),
            tags: [v.trim().toLowerCase()],
            snippet: `${f.label}: ${v}`,
            threadId: k?._id ?? null,
          })
        );
      }
      continue;
    }
    if ((f.type !== "long_text" && f.type !== "short_text") || typeof f.value !== "string" || !f.value.trim()) continue;
    const kata = parseKataFieldId(f.fieldId);
    const thread = kata?.threadId ? known.find((k) => k._id === kata.threadId) : undefined;
    if (thread) {
      out.push(
        candidate({
          title: thread.title,
          kind: thread.kind,
          status: statusIn(f.value),
          note: trimEnd(f.value).slice(0, 280),
          snippet: f.value.trim().slice(0, 500),
          threadId: thread._id,
        })
      );
    }
    texts.push({ label: kata ? "" : f.label, text: f.value, hint: kata ? null : hintFor(f.label) });
  }

  const joined = texts.map((t) => t.text).join("\n");
  out.push(...hashtagCandidates(joined, opts));
  const ai =
    isGroqConfigured() && opts.useAi !== false && joined.trim()
      ? await groqThreads(texts.map((t) => (t.label ? `${t.label}\n${t.text}` : t.text)).join("\n\n"), opts)
      : null;
  if (ai) out.push(...ai);
  else for (const t of texts) out.push(...heuristicThreads(t.text, opts, t.hint));
  return mergeAll(out);
}

/** Splits a direct answer ("the webhook, interview prep and the gym") into items. */
export function splitList(text: string): string[] {
  return normalize(text)
    .split(/\s*(?:[,;\n•]|\s-\s|\band\b|\bthen\b|&|\+)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

const LEAD_IN =
  /^(?:probably|maybe|mostly|mainly|also|plus|then|next|and|i'll|i will|i'm|i am|getting back to|back to|continue(?: with)?|more|some|the rest of)\s+/i;

/**
 * Items the writer named on purpose (onboarding focus, an answer to "What's on
 * your plate?"). Each short item is a thread even without a pattern around it.
 */
export function candidatesFromItems(items: string[], opts: ExtractOptions = {}): ThreadCandidate[] {
  const out: ThreadCandidate[] = [];
  for (const raw of items) {
    let item = normalize(raw).trim();
    let prev = "";
    while (prev !== item) {
      prev = item;
      item = item.replace(LEAD_IN, "");
    }
    if (!item) continue;
    const found = heuristicThreads(item, opts);
    if (found.length) {
      out.push(...found);
      continue;
    }
    const title = cleanTitle(takePhrase(item, true));
    if (!title) continue;
    const k = resolveKnown(title, [], opts.known ?? []);
    const day = parseDay(item, opts.today);
    const kind = k?.kind ?? guessKind(title);
    out.push(
      candidate({
        title: k?.title ?? title,
        kind,
        status: statusIn(item),
        snippet: raw.trim(),
        dueAt: kind === "event" && day ? dayToDate(day) : null,
        threadId: k?._id ?? null,
      })
    );
  }
  return mergeAll(out);
}
