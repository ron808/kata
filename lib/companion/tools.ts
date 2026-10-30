import mongoose from "mongoose";
import { nanoid } from "nanoid";
import type { ChatCompletionMessageToolCall, ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { askBreakdown, breakdownReceipt, toBreakdownT } from "@/lib/breakdowns";
import { PERIOD_IDEAS, parsePeriod, periodTitle } from "@/lib/breakdowns/period";
import { scoreText, summaryLine } from "@/lib/breakdowns/summary";
import type { IChoice, IChoiceInput, IReceipt, ReceiptKind } from "@/lib/db/models/CompanionMessage";
import { Entry } from "@/lib/db/models/Entry";
import { MOMENT_KINDS, Moment, VISIBILITIES } from "@/lib/db/models/Moment";
import { Notification } from "@/lib/db/models/Notification";
import { Template, type ITemplate, type ITemplateField } from "@/lib/db/models/Template";
import { THREAD_KINDS, THREAD_STATUSES, Thread, threadKey, type IThread, type IThreadField, type ThreadKind, type ThreadStatus } from "@/lib/db/models/Thread";
import { CHECK_INS, User } from "@/lib/db/models/User";
import { PageError, savePage } from "@/lib/entries/save";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { follow, replyTo, shareMoment, unfollow } from "@/lib/social/actions";
import { sendMessage } from "@/lib/social/messages";
import { handleOf, normalizeHandle } from "@/lib/social/handles";
import type { EntryField, FieldType, FieldValue, ReplyT } from "@/lib/types";
import { todayUtcMidnight } from "@/lib/utils/dates";
import type { EngineCtx } from "./engine";
import { FIELDS_MAX, TRACKED_KINDS, fieldKey, guessFields, parseTrack, specText, valueText } from "./fields";
import { applyInputs, complete, ideas, input, logChoice } from "./forms";
import { COMPANION_COLOURS, COMPANION_NAME_MAX, NAME_IDEAS, NICKNAME_MAX, tidyName } from "./name";
import { nameReceipts } from "./naming";
import type { ScreenItem } from "./screen";
import { createThread, habitDone, logItem, nextHue, saveThread, touch, withFields, withLog, withValue } from "./threads";
import { guessKind } from "./extract";
import { capFirst } from "./text";
import { dateToDay, dayDiff, localDay, parseDueAt } from "./time";

/**
 * Everything Maru can do in the app, as tools for the model. Each one checks what it's given,
 * does one thing through the same code the app uses, leaves a receipt for the writer, and
 * says in a line what happened. Choices (offer_choices, draft_replies, share_moment) are only
 * offered: the writer's tap runs them later, without the model (runChoice). Anything other
 * people would see is only ever a choice.
 */

export type ClientAction =
  | { type: "navigate"; href: string }
  | { type: "theme"; value: "light" | "dark" | "system" }
  | { type: "refresh" }
  /** Maru wrote on today's page: an open page adds the same text to that field. */
  | { type: "page-write"; fieldId: string; text: string }
  /** A reply went up: the post on screen shows it at once. */
  | { type: "replied"; momentId: string; reply: ReplyT; count: number | null };

export interface Turn {
  ctx: EngineCtx;
  /** What the writer said this turn, for thread logs. */
  said: string;
  /** The page they're on (a path), so Maru doesn't offer to open it. */
  where: string | null;
  /** Answers to Maru's question; a tap says it back. */
  replies: string[];
  /** Things Maru offers to do; a tap does it. */
  choices: IChoice[];
  /** The line above the choices when it has to be in fixed words (a draft others would see). */
  ask: string | null;
  /** Threads changed: the map needs the fresh list. */
  changed: boolean;
  actions: ClientAction[];
  /** What tools did, shown as receipts. Maru may only say it did what's here. */
  done: IReceipt[];
  /** The posts on the writer's screen, numbered as the model saw them. */
  screen: ScreenItem[];
  /** The one they're on. */
  here: string | null;
}

export function newTurn(ctx: EngineCtx, said: string, screen: ScreenItem[] = [], where: string | null = null, here: string | null = null): Turn {
  return { ctx, said, where: where?.split(/[?#]/)[0] ?? null, replies: [], choices: [], ask: null, changed: false, actions: [], done: [], screen, here };
}

type Args = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : []);

/**
 * A tool that couldn't do what was asked. The message is fit to show the writer (a tapped
 * choice shows it); the hint is for the model only.
 */
class Unable extends Error {
  constructor(
    message: string,
    readonly hint = ""
  ) {
    super(message);
  }
}

function receipt(turn: Turn, kind: ReceiptKind, text: string, detail = "", href: string | null = null, hue: number | null = null) {
  turn.done.push({ kind, text: text.slice(0, 80), detail: detail.slice(0, 240), href, hue });
}

const quoted = (s: string, max = 120) => `“${s.length > max ? `${s.slice(0, max - 1)}…` : s}”`;

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/^\s*(?:the|my|our)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const FILLER = new Set(["what", "did", "do", "does", "i", "me", "my", "the", "a", "an", "to", "of", "for", "on", "in", "about", "is", "am", "are", "question", "thread"]);
const stem = (w: string) => (w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, "").replace(/([^aeiou])\1$/, "$1") : w);
const keywords = (s: string) =>
  norm(s)
    .replace(/'s\b/g, "")
    .split(" ")
    .filter((w) => w && !FILLER.has(w))
    .map(stem);

/**
 * The best match for a name among things with a label: exact, then prefix, then contains,
 * then the one label with all its key words in any form ("what I learned" finds "What did I learn today?").
 */
function closest<T>(items: T[], name: string, label: (t: T) => string): T | null {
  const n = norm(name);
  if (!n) return null;
  const found =
    items.find((t) => norm(label(t)) === n) ??
    items.find((t) => norm(label(t)).startsWith(n) || n.startsWith(norm(label(t)))) ??
    items.find((t) => norm(label(t)).includes(n) || n.includes(norm(label(t))));
  if (found) return found;
  const want = keywords(name);
  const fits = want.length
    ? items.filter((t) => {
        const has = new Set(keywords(label(t)));
        return want.every((w) => has.has(w));
      })
    : [];
  return fits.length === 1 ? fits[0] : null;
}

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): ChatCompletionTool => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

/** What a tapped choice may run: everything that only touches the writer's own things. */
const CHOOSABLE = [
  "update_thread",
  "create_thread",
  "log_thread",
  "archive_thread",
  "remember",
  "write_on_page",
  "add_page_question",
  "remove_page_question",
  "rename_page_question",
  "use_page",
  "set_check_in",
  "set_interests",
  "set_names",
  "set_theme",
  "follow",
  "unfollow",
  "open_page",
  "make_breakdown",
];

/** What a choice may run, as the model sees it: drafting replies only when there are posts on screen. */
const offerChoicesTool = (tools: string[]) =>
  fn(
    "offer_choices",
    "Two to four buttons instead of an open question. One with `do` runs that tool when tapped (an argument left out becomes a form for it); one without is an answer they tap. Name the thing in each label (Track “Fix the leak”, Due Friday). There's always a Not now button.",
    {
      ask: { type: "string", description: "One short line above the buttons." },
      choices: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Under six words: what tapping it does or says." },
            do: {
              type: "object",
              properties: { tool: { type: "string", enum: tools }, args: { type: "object" } },
              required: ["tool", "args"],
            },
          },
          required: ["label"],
        },
      },
    },
    ["choices"]
  );
const OFFER_WITH_DRAFTS = offerChoicesTool([...CHOOSABLE, "draft_replies"]);

// What a thread keeps a value on, as the model gives it. Sent with every message, so short.
const TRACK = {
  type: "array",
  description: 'Up to four, only what fits. A walk: [{"name":"Minutes","unit":"min"},{"name":"Km","unit":"km"}]; a party: [{"name":"Guests"},{"name":"Venue","text":true}].',
  items: {
    type: "object",
    properties: { name: { type: "string" }, unit: { type: "string" }, goal: { type: "number" }, text: { type: "boolean" } },
    required: ["name"],
  },
};

const TOOLS: Record<string, ChatCompletionTool> = {
  update_thread: fn(
    "update_thread",
    "Change a thread: where it is, the next step, a note, a due date, what it keeps track of, whether it shows on their profile.",
    {
      thread: { type: "string", description: "Its title, as listed." },
      status: { type: "string", enum: [...THREAD_STATUSES] },
      next_step: { type: "string", description: "The very next action. Empty clears it." },
      note: { type: "string", description: "Where it stands, in their words. For stuck or waiting: on what." },
      due: { type: "string", description: "YYYY-MM-DD, or empty to clear." },
      shared: { type: "boolean", description: "Show it on their profile." },
      track: TRACK,
      untrack: { type: "array", items: { type: "string" }, description: "Names to stop keeping track of." },
    },
    ["thread"]
  ),
  create_thread: fn(
    "create_thread",
    "Start tracking something new: a project, task, goal, habit, person or event. Leave out what they haven't said: they get a form for it.",
    {
      title: { type: "string", description: "Two to four words. Leave out if they haven't said what it is." },
      ideas: { type: "array", items: { type: "string" }, description: "No title: two or three likely ones, from what you know about them." },
      kind: { type: "string", enum: [...THREAD_KINDS] },
      status: { type: "string", enum: [...THREAD_STATUSES] },
      next_step: { type: "string" },
      note: { type: "string" },
      due: { type: "string", description: "YYYY-MM-DD" },
      track: TRACK,
    }
  ),
  log_thread: fn(
    "log_thread",
    "Log what they did on a thread: a value for what it keeps track of. A habit logged counts as done that day. A name it doesn't keep yet is added.",
    {
      thread: { type: "string" },
      values: { type: "object", description: 'Name → number or words: {"Minutes": 30, "Km": 2.5}. Leave out what they didn\'t say: they get a form.' },
      add: { type: "boolean", description: 'More on top of what\'s logged that day ("another 15 min"), not instead of it.' },
      day: { type: "string", description: "YYYY-MM-DD, if not today." },
    },
    ["thread"]
  ),
  archive_thread: fn("archive_thread", "Stop tracking a thread (it can come back if mentioned again).", { thread: { type: "string" } }, ["thread"]),
  remember: fn("remember", "Keep a lasting fact about them: people, preferences, routines, plans.", { fact: { type: "string" } }, ["fact"]),
  forget: fn("forget", "Drop something you remember, when they ask.", { fact: { type: "string", description: "Words from it." } }, ["fact"]),
  search_pages: fn(
    "search_pages",
    "Look through their past journal pages for words or a topic.",
    { query: { type: "string" }, days: { type: "number", description: "How far back. Default 60." } },
    ["query"]
  ),
  offer_choices: offerChoicesTool(CHOOSABLE),
  open_page: fn(
    "open_page",
    "Take them to a page of the app.",
    {
      page: {
        type: "string",
        enum: ["home", "today", "pages", "letters", "breakdowns", "threads", "memories", "people", "discover", "find_people", "notifications", "gallery", "builder", "settings", "profile"],
      },
      handle: { type: "string", description: "For a profile: whose. Leave out for their own." },
    },
    ["page"]
  ),
  write_on_page: fn(
    "write_on_page",
    "Add their words to today's journal page, under one of its questions.",
    {
      text: { type: "string", description: "What to add, in their words." },
      question: { type: "string", description: "Which question to file it under. Leave out for the first one." },
    },
    ["text"]
  ),
  add_page_question: fn(
    "add_page_question",
    "Add a question to the page they fill in every day.",
    {
      question: { type: "string", description: "The question, short, in sentence case." },
      kind: { type: "string", enum: ["text", "short_text", "yes_no", "rating", "mood", "energy", "number", "tags"] },
    },
    ["question"]
  ),
  remove_page_question: fn("remove_page_question", "Take a question off their daily page.", { question: { type: "string" } }, ["question"]),
  use_page: fn("use_page", "Switch their daily page to another of their saved pages, by name. The one before stays saved.", { page: { type: "string" } }, ["page"]),
  make_breakdown: fn(
    "make_breakdown",
    "Break down how a stretch of their time went, worked out from their threads, habits, logged numbers, pages and moods, with a score out of 10. It's kept on their Breakdowns page and they see it as a receipt. Leave period out if they didn't say which stretch: they get choices.",
    { period: { type: "string", description: "Their words or dates: this week, last month, this year, last 30 days, October, since Oct 3, 2026-10-01 to 2026-10-15." } }
  ),
  rename_page_question: fn(
    "rename_page_question",
    "Reword a question on their daily page.",
    { question: { type: "string" }, to: { type: "string" } },
    ["question", "to"]
  ),
  set_check_in: fn("set_check_in", "When you check in each day.", { when: { type: "string", enum: [...CHECK_INS] } }, ["when"]),
  set_interests: fn(
    "set_interests",
    "Change the topics you ask about on their page.",
    { add: { type: "array", items: { type: "string" } }, remove: { type: "array", items: { type: "string" } } }
  ),
  update_profile: fn(
    "update_profile",
    "Draft a new name or bio for their profile (they check it and save it with a tap), or make the profile public or private. Going public waits for their tap.",
    { name: { type: "string" }, bio: { type: "string", description: "Up to 160 characters, in their words; a blank like [city] where you don't know." }, public: { type: "boolean" } }
  ),
  set_names: fn(
    "set_names",
    "Change what they call you, what you call them, or the colour you wear.",
    {
      yours: { type: "string", description: "Your new name." },
      theirs: { type: "string", description: "What to call them." },
      colour: { type: "string", enum: COMPANION_COLOURS.map((c) => c.label.toLowerCase()) },
    }
  ),
  set_theme: fn("set_theme", "Switch the app between light, dark and following the system.", { theme: { type: "string", enum: ["light", "dark", "system"] } }, ["theme"]),
  share_moment: fn(
    "share_moment",
    "Draft a moment for their profile (a win, a ship, a thought, a question). It's shared only when they tap it.",
    {
      text: { type: "string", description: "What they said, in their words, up to 500 characters. Add nothing they didn't say." },
      kind: { type: "string", enum: [...MOMENT_KINDS] },
      visibility: { type: "string", enum: [...VISIBILITIES], description: "public: everyone; friends: people who follow each other." },
      tags: { type: "array", items: { type: "string" } },
    },
    ["text", "kind"]
  ),
  draft_message: fn(
    "draft_message",
    "Draft a private message from them to someone by @handle, in their voice, for them to check and send. Nothing is sent until they tap it.",
    {
      to: { type: "string", description: "@handle" },
      text: { type: "string", description: "Up to 600 characters. Claim nothing about them you don't know: leave a blank like [day]." },
    },
    ["to", "text"]
  ),
  draft_replies: fn(
    "draft_replies",
    "Draft two or three replies to a post on their screen, in their voice, written to its author about what it says, for them to pick from and edit. Nothing is posted until they tap one.",
    {
      post: { type: "number", description: "The post's number on their screen." },
      to: { type: "string", description: "Who wrote that post, as @handle. Always give it." },
      replies: {
        type: "array",
        items: { type: "string" },
        description:
          "Each specific to the post, under 200 characters, not asking what it already says. Claim nothing about them you don't know: for “What are you reading?” write “I’m reading [book]. Short chapters, good for the tram.”, never a made-up title.",
      },
    },
    ["post", "replies"]
  ),
  follow: fn("follow", "Follow someone by their @handle.", { handle: { type: "string" } }, ["handle"]),
  unfollow: fn("unfollow", "Stop following someone by their @handle.", { handle: { type: "string" } }, ["handle"]),
  clear_notifications: fn("clear_notifications", "Mark all their notifications read.", {}),
};

// Every tool's definition costs tokens on every call, and the free tier counts tokens per
// minute, so a message gets the core tools plus the groups its words point to.
const CORE = ["update_thread", "create_thread", "remember", "forget", "search_pages", "offer_choices", "open_page"];
const GROUPS: [RegExp, string[]][] = [
  [
    /\b(?:pages?|journal|questions?|prompts?|template|layout|write|note|jot|put|log|add|rename|reword|switch)\b/i,
    ["write_on_page", "add_page_question", "remove_page_question", "rename_page_question", "use_page"],
  ],
  [
    /\b(?:check.?ins?|(?:every|each|in the|mornings? (?:and|or)) (?:mornings?|evenings?|night)|interests?|topics?|ask(?:ing)?|bio|profile|public|private|names?|nickname|call (?:you|me)|colou?rs?|theme|dark|light|mode|settings?)\b/i,
    ["set_check_in", "set_interests", "update_profile", "set_names", "set_theme"],
  ],
  [
    /\b(?:share|post|moment|follow|unfollow|friends?|people|notifications?|message|dm|text|write to|ask|@\w+)/i,
    ["share_moment", "draft_message", "follow", "unfollow", "clear_notifications"],
  ],
  [/\b(?:archive|stop tracking|drop|remove|delete|get rid|not tracking|forget about)\b/i, ["archive_thread"]],
  // A number with a unit, or a word for doing something again ("walked 30 min", "log my run").
  [
    /\d\s*(?:min|mins|minutes?|h|hrs?|hours?|km|kms|k|mi|miles?|m|steps?|pages?|reps?|sets?|laps?|glasses|cups?|kg|lbs?|words?|times?)\b|\b(?:log|logged|track(?:ing)?|walked|ran|read|slept|drank|swam|cycled|meditated|practi[cs]ed|studied|lifted)\b/i,
    ["log_thread"],
  ],
];
// A question about what's there ("what did I write", "is it done") only reads.
const PURE_QUESTION = /^(?:what|when|where|who|whom|whose|why|how|which|did|do|does|was|were|is|are|am|have|has|had)\b[^]*\?\s*$/i;
const READ_ONLY = ["search_pages", "offer_choices", "open_page"];
// "How was my week?", "give me a breakdown", "how productive was I": a breakdown only reads, so a question gets it too.
const BREAKDOWN =
  /\b(?:break\s?downs?|reports?|recaps?|summar(?:y|ies|i[sz]e)|review|wrapped|stats|statistics|productiv\w*|score|rate (?:me|my|it|how)|scale of|out of (?:10|ten)|how (?:did|was|were|have|has) (?:i|my|the|this|last|that)\b|how much (?:did i|i did|have i|i've|i got))/i;

/** A question about what's there, which only reads. */
export const readsOnly = (said: string) => PURE_QUESTION.test(said.trim());

/**
 * The tools a message gets: what its words point to, or every one (still only reading for a
 * question). Posts on the screen bring draft_replies, which only drafts; threads that keep
 * numbers bring log_thread.
 */
export function toolsFor(said: string, { every = false, screen = false, logs = false, also = "" } = {}): ChatCompletionTool[] {
  // Always in the same order, so the provider's cache of the tools keeps working.
  const names = new Set(readsOnly(said) ? READ_ONLY : every ? Object.keys(TOOLS) : CORE);
  if (logs && !readsOnly(said)) names.add("log_thread");
  // The groups follow their words, and the ones just before them (`also`), so a reply keeps its tools.
  const words = `${said}\n${also}`;
  if (BREAKDOWN.test(words)) names.add("make_breakdown");
  if (!readsOnly(said) && !every) for (const [test, tools] of GROUPS) if (test.test(words)) tools.forEach((t) => names.add(t));
  // A question about a post ("what do you think?") gets an answer, not drafts.
  const drafts = screen && !readsOnly(said);
  if (drafts) names.add("draft_replies");
  else names.delete("draft_replies");
  return [...names].map((n) => (n === "offer_choices" && drafts ? OFFER_WITH_DRAFTS : TOOLS[n]));
}

// ── Threads ───────────────────────────────────────────────────────────────────

async function findThread(ctx: EngineCtx, name: string): Promise<IThread | null> {
  const all = await Thread.find({ userId: ctx.userId, archived: false }).sort({ lastTouchedAt: -1 }).limit(100).lean<IThread[]>();
  return closest(all, name, (t) => t.title);
}

/** A due date from the model, or undefined when it isn't one (so a bad date never clears a good one). */
function dueFrom(raw: string | undefined, ctx: EngineCtx): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === "") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? parseDueAt(raw, ctx.tz) ?? undefined : undefined;
}

const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

async function updateThread(turn: Turn, args: Args): Promise<string> {
  const { ctx } = turn;
  const name = str(args.thread) ?? "";
  const t = await findThread(ctx, name);
  if (!t) throw new Unable(`No thread called “${name}”.`, "Use create_thread if it's new.");

  const set: Partial<IThread> = {};
  const changes: string[] = [];
  const status = THREAD_STATUSES.find((s) => s === args.status);
  const note = str(args.note);
  let logStatus: ThreadStatus | null = null;

  if (status === "done" && t.kind === "habit") {
    const done = habitDone(t, ctx);
    if (done) Object.assign(set, done);
    changes.push(done ? `today counted, ${done.streak}-day streak` : "today was already counted");
  } else if (status && status !== t.status) {
    set.status = status;
    logStatus = status;
    changes.push(`now ${status}`);
    if (status === "done") set.nextStep = "";
    if (!note) set.lastNote = "";
  }
  const next = str(args.next_step);
  if (next !== undefined) {
    set.nextStep = next.slice(0, 140);
    changes.push(next ? `next: ${next}` : "next step cleared");
  }
  if (note) {
    set.lastNote = note.slice(0, 280);
    changes.push(`note: ${note}`);
  }
  const due = dueFrom(str(args.due), ctx);
  if (due !== undefined) {
    set.dueAt = due;
    changes.push(due ? `due ${shortDay(dateToDay(due))}` : "due date cleared");
  } else if (str(args.due)) {
    changes.push("the due date wasn't YYYY-MM-DD, so it wasn't changed");
  }
  if (typeof args.shared === "boolean") {
    set.shared = args.shared;
    changes.push(args.shared ? "shown on your profile" : "hidden from your profile");
  }
  const track = parseTrack(args.track);
  const untrack = list(args.untrack);
  if (track.length || untrack.length) {
    const before = t.fields ?? [];
    const fields = withFields(before, track, untrack);
    const added = fields.filter((f) => !before.some((b) => b.key === f.key)).map((f) => f.label);
    const dropped = before.filter((b) => !fields.some((f) => f.key === b.key)).map((f) => f.label);
    const noRoom = track.filter((s) => !fields.some((f) => f.key === fieldKey(s.label))).map((s) => s.label);
    set.fields = fields;
    if (added.length) changes.push(`keeps track of ${added.join(", ")}`);
    if (dropped.length) changes.push(`no longer tracks ${dropped.join(", ")}`);
    if (noRoom.length) changes.push(`no room for ${noRoom.join(", ")}: a thread keeps ${FIELDS_MAX} at most`);
    if (!added.length && !dropped.length && !noRoom.length) changes.push("updated what it tracks");
  }
  if (!Object.keys(set).length) throw new Unable(`Nothing changed on “${t.title}”${changes.length ? `: ${changes.join("; ")}` : ""}.`);

  if (logStatus || note) set.log = withLog(t.log, logItem(note ?? turn.said.slice(0, 200), logStatus, "you", ctx.now));
  // A habit's lastTouchedAt is the last day it was done, so only the streak moves it.
  if (t.kind !== "habit") Object.assign(set, touch(t, ctx));
  await saveThread(ctx, t._id, set);
  turn.changed = true;
  receipt(turn, "thread", `Updated ${t.title}`, changes.join(" · "), threadHref(t), t.hue);
  return `Updated "${t.title}": ${changes.join("; ")}.`;
}

const threadHref = (t: Pick<IThread, "_id">) => `/threads?t=${String(t._id)}`;
const titleOf = (v: unknown) => capFirst((str(v) ?? "").replace(/\s+/g, " ")).slice(0, 60);
/** The kind of thread their words name: "track a new habit". */
const kindSaid = (said: string) => THREAD_KINDS.find((k) => k !== "other" && new RegExp(`\\b${k}s?\\b`, "i").test(said));

async function createThreadTool(turn: Turn, args: Args): Promise<string> {
  const { ctx } = turn;
  const title = titleOf(args.title);
  if (!title) throw new Unable("A thread needs a title.");
  const existing = await findThread(ctx, title);
  if (existing && threadKey(existing.title) === threadKey(title)) return updateThread(turn, { ...args, thread: existing.title });

  // No kind given (or a form left it): the one they named, else a guess from the title.
  const kind: ThreadKind = THREAD_KINDS.find((k) => k === args.kind && k !== "other") ?? kindSaid(turn.said) ?? guessKind(title);
  const wanted = THREAD_STATUSES.find((s) => s === args.status);
  const dueAt = dueFrom(str(args.due), ctx) ?? null;
  // What it keeps a number on: what Maru or the form said, else a guess from the title.
  const fields = args.track === undefined ? guessFields(title, kind) : parseTrack(args.track);
  const created = await createThread(
    ctx,
    {
      title,
      kind,
      status: wanted && wanted !== "done" ? wanted : "moving",
      // A next step that only repeats the title says nothing.
      nextStep: norm(str(args.next_step) ?? "") === norm(title) ? "" : (str(args.next_step) ?? ""),
      lastNote: str(args.note) ?? "",
      dueAt,
      source: "kata",
      said: turn.said.slice(0, 200),
      from: "you",
      didToday: kind === "habit" && wanted === "done",
      fields,
    },
    await nextHue(ctx.userId)
  );
  if (!created) {
    // The same name as one they stopped tracking: it comes back, with what they said now.
    const old = await Thread.findOne({ userId: ctx.userId, key: threadKey(title) }).lean<IThread>();
    if (!old?.archived) return `Already keeping track of "${title}".`;
    await saveThread(ctx, old._id, { archived: false });
    turn.changed = true;
    try {
      const out = await updateThread(turn, { ...args, thread: old.title });
      turn.done[turn.done.length - 1].text = `Tracking ${old.title} again`;
      return out;
    } catch (err) {
      if (!(err instanceof Unable)) throw err;
      receipt(turn, "thread", `Tracking ${old.title} again`, old.kind === "other" ? "" : old.kind, threadHref(old), old.hue);
      return `Tracking "${old.title}" again.`;
    }
  }
  turn.changed = true;
  const detail = [
    kind === "other" ? "" : kind,
    dueAt ? `due ${shortDay(dateToDay(dueAt))}` : "",
    created.nextStep ? `next: ${created.nextStep}` : "",
    created.fields.length ? `tracks ${created.fields.map((f) => f.label.toLowerCase()).join(", ")}` : "",
  ].filter(Boolean);
  receipt(turn, "thread", `Tracking ${created.title}`, detail.join(" · "), threadHref(created), created.hue);
  return `Now keeping track of "${created.title}" (${kind}${created.fields.length ? `; it tracks ${created.fields.map((f) => f.label).join(", ")}` : ""}).`;
}

/** A logged value as the model or a form gave it: a number where the field keeps one. */
function valueFor(f: Pick<IThreadField, "type">, raw: unknown): number | string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (f.type === "text") return String(raw).replace(/\s+/g, " ").trim().slice(0, 120) || null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const n = Number(String(raw).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(n) ? n : null;
}

async function logThread(turn: Turn, args: Args): Promise<string> {
  const { ctx } = turn;
  const t = await findThread(ctx, str(args.thread) ?? "");
  if (!t) throw new Unable(`No thread called “${str(args.thread) ?? ""}”.`, "Use create_thread if it's new.");
  const given = args.values && typeof args.values === "object" ? Object.entries(args.values as Args) : [];
  const asked = str(args.day);
  const day = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && dayDiff(ctx.day, asked) >= 0 && dayDiff(ctx.day, asked) <= 30 ? asked : ctx.day;

  let fields = [...(t.fields ?? [])];
  const logged: [order: number, text: string][] = [];
  const noRoom: string[] = [];
  let added = false;
  for (const [name, raw] of given) {
    let f = closest(fields, name, (x) => x.label);
    if (!f) {
      // Something it doesn't keep yet: it does now, if there's room.
      const unit = typeof raw === "string" ? (raw.match(/^\s*-?[\d.,]+\s*([a-z]{1,6})\b/i)?.[1] ?? "") : "";
      const numeric = typeof raw === "number" || /^\s*-?[\d.,]+/.test(String(raw));
      const [spec] = parseTrack([{ name, unit, text: !numeric }]);
      if (!spec || fields.length >= FIELDS_MAX) {
        noRoom.push(name);
        continue;
      }
      fields = withFields(fields, [spec]);
      f = fields.find((x) => x.key === fieldKey(spec.label))!;
    }
    let value = valueFor(f, raw);
    if (value === null) continue;
    // "Another 15 minutes": on top of what that day already has.
    const before = f.days?.find((d) => d.day === day)?.value;
    if (args.add === true && typeof value === "number" && before !== undefined) {
      value = Math.round((before + value) * 100) / 100;
      added = true;
    }
    fields = fields.map((x) => (x.key === f!.key ? withValue(x, value, day, ctx.now) : x));
    logged.push([fields.findIndex((x) => x.key === f!.key), valueText(f, value)]);
  }
  if (!logged.length) throw new Unable(noRoom.length ? `${t.title} keeps ${FIELDS_MAX} things at most.` : "Nothing to log.");
  // In the order the thread keeps them.
  const lines = logged.sort((a, b) => a[0] - b[0]).map(([, text]) => text);

  const set: Partial<IThread> = { fields };
  const today = day === ctx.day;
  const streak = t.kind === "habit" && today ? habitDone(t, ctx) : null;
  if (streak) Object.assign(set, streak);
  else if (t.kind !== "habit") Object.assign(set, touch(t, ctx));
  // The numbers keep their own history (the thread's strip), so they stay out of its log.
  await saveThread(ctx, t._id, set);
  turn.changed = true;
  const total = added ? ` ${today ? "today" : "that day"} in all` : "";
  const detail = [`${lines.join(" · ")}${total}`, today ? "" : shortDay(day), streak && streak.streak > 1 ? `${streak.streak}-day streak` : ""].filter(Boolean).join(" · ");
  receipt(turn, "thread", `Logged ${t.title}`, detail, threadHref(t), t.hue);
  return `Logged on "${t.title}": ${lines.join(", ")}${total}${noRoom.length ? `. No room for ${noRoom.join(", ")}` : ""}.`;
}

async function archiveThread(turn: Turn, args: Args): Promise<string> {
  const t = await findThread(turn.ctx, str(args.thread) ?? "");
  if (!t) throw new Unable(`No thread called “${str(args.thread) ?? ""}”.`);
  await saveThread(turn.ctx, t._id, { archived: true });
  turn.changed = true;
  receipt(turn, "thread", `Stopped tracking ${t.title}`, "It comes back if you mention it again.", "/threads", t.hue);
  return `Stopped tracking "${t.title}".`;
}

// ── Memory and pages ──────────────────────────────────────────────────────────

async function remember(turn: Turn, args: Args): Promise<string> {
  const text = (str(args.fact) ?? "").replace(/\s+/g, " ").slice(0, 200);
  if (!text) throw new Unable("Nothing to remember.");
  const known = turn.ctx.user.memories ?? [];
  if (known.some((m) => norm(m.text) === norm(text))) return "Already remembered.";
  await User.updateOne({ _id: turn.ctx.userId }, { $push: { memories: { $each: [{ text, at: turn.ctx.now }], $slice: -40 } } });
  turn.ctx.user.memories = [...known, { _id: new mongoose.Types.ObjectId(), text, at: turn.ctx.now }];
  receipt(turn, "memory", "Remembered", text, "/threads#memories");
  return `Remembered: ${text}`;
}

async function forget(turn: Turn, args: Args): Promise<string> {
  const words = norm(str(args.fact) ?? "").split(" ").filter((w) => w.length > 2);
  const gone = (turn.ctx.user.memories ?? []).filter((m) => words.length > 0 && words.every((w) => norm(m.text).includes(w)));
  if (!gone.length) throw new Unable("Nothing I remember matches that.");
  await User.updateOne({ _id: turn.ctx.userId }, { $pull: { memories: { _id: { $in: gone.map((m) => m._id) } } } });
  receipt(turn, "memory", "Forgot", gone.map((m) => m.text).join("; "), "/threads#memories");
  return `Forgot: ${gone.map((m) => m.text).join("; ")}`;
}

export function fieldText(value: unknown): string {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export const dayLabel = (d: Date) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

async function searchPages(turn: Turn, args: Args): Promise<string> {
  const query = str(args.query) ?? "";
  const words = norm(query).split(" ").filter((w) => w.length > 2).slice(0, 6);
  if (!words.length) throw new Unable("Give a word or two to look for.");
  const days = Math.min(Math.max(Number(args.days) || 60, 1), 365);
  const since = new Date(turn.ctx.now.getTime() - days * 86_400_000);
  const entries = await Entry.find({ userId: turn.ctx.userId, date: { $gte: since } }).sort({ date: -1 }).limit(200).select("date fields").lean();
  const hits: string[] = [];
  for (const e of entries) {
    for (const f of e.fields) {
      const v = fieldText(f.value);
      const low = v.toLowerCase();
      const word = words.find((w) => low.includes(w));
      if (!word) continue;
      const at = Math.max(0, low.indexOf(word) - 80);
      hits.push(`[${dayLabel(e.date)}] ${f.label}: ${at ? "…" : ""}${v.slice(at, at + 220)}`);
      if (hits.length === 6) return hits.join("\n");
    }
  }
  return hits.length ? hits.join("\n") : `Nothing about "${query}" in the last ${days} days of pages.`;
}

const blankFor = (type: FieldType): FieldValue => (type === "tags" ? [] : ["long_text", "short_text", "link"].includes(type) ? "" : null);
const WRITABLE: FieldType[] = ["long_text", "short_text"];

async function activeTemplate(ctx: EngineCtx): Promise<ITemplate | null> {
  if (!ctx.user.activeTemplateId) return null;
  return Template.findOne({ _id: ctx.user.activeTemplateId, userId: ctx.userId }).lean<ITemplate>();
}

/** The page's questions, for the model to pick from when a name didn't match. */
const asks = (template: ITemplate) => `The page asks: ${template.fields.map((f) => f.label).join(" | ")}.`;

async function saveFields(template: ITemplate, fields: ITemplateField[]) {
  await Template.updateOne({ _id: template._id }, { $set: { fields: fields.map((f, i) => ({ ...f, order: i })) } });
}

async function writeOnPage(turn: Turn, args: Args): Promise<string> {
  const text = (str(args.text) ?? "").slice(0, 2000);
  if (!text) throw new Unable("Nothing to write.");
  const template = await activeTemplate(turn.ctx);
  if (!template) throw new Unable("There's no daily page yet. Set one up from Home.");
  const writable = template.fields.filter((f) => WRITABLE.includes(f.type as FieldType));
  if (!writable.length) throw new Unable("Today's page has no question that takes writing.");
  const question = str(args.question);
  const target = (question ? closest(writable, question, (f) => f.label) : null) ?? writable[0];

  const today = await Entry.findOne({ userId: turn.ctx.userId, date: todayUtcMidnight() }).lean();
  const saved = new Map((today?.fields ?? []).map((f) => [f.fieldId, f]));
  const fields: EntryField[] = template.fields.map((f) => ({
    fieldId: f.id,
    type: f.type as FieldType,
    label: f.label,
    value: (saved.get(f.id)?.value as FieldValue | undefined) ?? blankFor(f.type as FieldType),
  }));
  // Kata's own questions answered today stay on the page.
  for (const f of today?.fields ?? []) {
    if (f.fieldId.startsWith("kata:")) fields.push({ fieldId: f.fieldId, type: f.type as FieldType, label: f.label, value: f.value as FieldValue });
  }
  const slot = fields.find((f) => f.fieldId === target.id)!;
  const before = typeof slot.value === "string" ? slot.value.trim() : "";
  slot.value = before ? `${before}\n${text}` : text;
  try {
    await savePage(turn.ctx.userId, { fields });
  } catch (err) {
    if (err instanceof PageError) throw new Unable(`Couldn't save the page: ${err.message}`);
    throw err;
  }
  turn.actions.push({ type: "page-write", fieldId: target.id, text }, { type: "refresh" });
  receipt(turn, "page", "Wrote on today’s page", `${quoted(text)} · ${target.label}`, "/entry/new");
  return `Added to today's page under "${target.label}".`;
}

const KINDS: Record<string, FieldType> = {
  text: "long_text",
  short_text: "short_text",
  yes_no: "yes_no",
  rating: "rating",
  mood: "mood_slider",
  energy: "energy",
  number: "number",
  tags: "tags",
};

async function addPageQuestion(turn: Turn, args: Args): Promise<string> {
  const label = capFirst((str(args.question) ?? "").replace(/\s+/g, " ")).slice(0, 120);
  if (!label) throw new Unable("A question needs words.");
  const template = await activeTemplate(turn.ctx);
  if (!template) throw new Unable("There's no daily page yet. Set one up from Home.");
  if (template.fields.length >= 20) throw new Unable("The page already has 20 questions, the most it holds.");
  if (template.fields.some((f) => norm(f.label) === norm(label))) throw new Unable(`“${label}” is already on the page.`);
  const field: ITemplateField = { id: nanoid(8), type: KINDS[str(args.kind) ?? "text"] ?? "long_text", label, required: false, order: 0, config: {} };
  await saveFields(template, [...template.fields, field]);
  turn.actions.push({ type: "refresh" });
  receipt(turn, "question", "Added a question to your page", label, "/settings/template");
  return `Added "${label}" to their daily page.`;
}

async function removePageQuestion(turn: Turn, args: Args): Promise<string> {
  const template = await activeTemplate(turn.ctx);
  if (!template) throw new Unable("There's no daily page yet.");
  const field = closest(template.fields, str(args.question) ?? "", (f) => f.label);
  if (!field) throw new Unable(`No question like “${str(args.question) ?? ""}”.`, asks(template));
  if (template.fields.length <= 1) throw new Unable("That's the only question on the page, so it stays.");
  await saveFields(template, template.fields.filter((f) => f.id !== field.id));
  turn.actions.push({ type: "refresh" });
  receipt(turn, "question", "Took a question off your page", field.label, "/settings/template");
  return `Took "${field.label}" off their page.`;
}

async function usePage(turn: Turn, args: Args): Promise<string> {
  const mine = await Template.find({ userId: turn.ctx.userId }).select("name").sort({ updatedAt: -1 }).limit(60).lean<Pick<ITemplate, "_id" | "name">[]>();
  const page = closest(mine, str(args.page) ?? "", (t) => t.name);
  if (!page) throw new Unable(`No page of theirs called “${str(args.page) ?? ""}”.`, mine.length ? `Their pages: ${mine.map((t) => t.name).join(" | ")}.` : "");
  if (turn.ctx.user.activeTemplateId && String(turn.ctx.user.activeTemplateId) === String(page._id)) return `"${page.name}" is already their daily page.`;
  await User.updateOne({ _id: turn.ctx.userId }, { $set: { activeTemplateId: page._id } });
  turn.ctx.user.activeTemplateId = page._id;
  turn.actions.push({ type: "refresh" });
  receipt(turn, "page", `“${page.name}” is today’s page`, "The one before stays in Your pages.", "/templates#your-pages");
  return `Switched their daily page to "${page.name}".`;
}

async function renamePageQuestion(turn: Turn, args: Args): Promise<string> {
  const template = await activeTemplate(turn.ctx);
  if (!template) throw new Unable("There's no daily page yet.");
  const field = closest(template.fields, str(args.question) ?? "", (f) => f.label);
  const to = capFirst((str(args.to) ?? "").replace(/\s+/g, " ")).slice(0, 120);
  if (!field) throw new Unable(`No question like “${str(args.question) ?? ""}”.`, asks(template));
  if (!to) throw new Unable("What should it say instead?");
  await saveFields(template, template.fields.map((f) => (f.id === field.id ? { ...f, label: to } : f)));
  turn.actions.push({ type: "refresh" });
  receipt(turn, "question", "Reworded a question", `${field.label} → ${to}`, "/settings/template");
  return `Changed "${field.label}" to "${to}".`;
}

// ── Settings and profile ──────────────────────────────────────────────────────

async function setCheckIn(turn: Turn, args: Args): Promise<string> {
  const when = CHECK_INS.find((c) => c === args.when);
  if (!when) throw new Unable("Check-ins can be morning, evening or both.");
  await User.updateOne({ _id: turn.ctx.userId }, { $set: { checkIn: when } });
  turn.actions.push({ type: "refresh" });
  const words = when === "both" ? "morning and evening" : `every ${when}`;
  receipt(turn, "settings", "Changed your check-ins", capFirst(words), "/settings");
  return `Check-ins are now ${words}.`;
}

const interest = (s: string) => s.replace(/^#/, "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 32);

async function setInterests(turn: Turn, args: Args): Promise<string> {
  const current = turn.ctx.user.interests ?? [];
  const add = list(args.add).map(interest).filter(Boolean);
  const remove = new Set(list(args.remove).map(interest));
  if (!add.length && !remove.size) throw new Unable("Say which topics to add or remove.");
  const next = [...new Set([...current.filter((i) => !remove.has(interest(i))), ...add])].slice(0, 12);
  await User.updateOne({ _id: turn.ctx.userId }, { $set: { interests: next } });
  turn.ctx.user.interests = next;
  turn.actions.push({ type: "refresh" });
  receipt(turn, "settings", "Changed your topics", next.length ? next.join(", ") : "None for now", "/settings");
  return next.length ? `Now asking about: ${next.join(", ")}.` : "No topics chosen now.";
}

// What others read on their profile waits for their tap, in words they can change first.
const PROFILE_MAX = { name: 80, bio: 160 } as const;

function profileDraft(field: keyof typeof PROFILE_MAX, text: string): IChoice {
  return {
    label: field === "bio" ? "Save bio" : "Save name",
    detail: text.slice(0, PROFILE_MAX[field]),
    kind: "settings",
    tool: "save_profile",
    args: { field, text: text.slice(0, PROFILE_MAX[field]) },
    editable: true,
    public: true,
    inputs: [],
    action: "",
    max: PROFILE_MAX[field],
  };
}

async function updateProfile(turn: Turn, args: Args): Promise<string> {
  const name = str(args.name)?.replace(/\s+/g, " ");
  const bio = str(args.bio)?.replace(/\s+/g, " ");
  const drafted: string[] = [];
  const done: string[] = [];
  // "I'm Sam" from Sam Rivera isn't a new name.
  const current = norm(turn.ctx.user.name ?? "");
  if (name && norm(name) !== current && !current.split(" ").includes(norm(name))) {
    turn.choices.push(profileDraft("name", name));
    drafted.push("name");
  }
  // Clearing the bio is an order, not something to check; new words are.
  if (bio) {
    turn.choices.push(profileDraft("bio", bio));
    drafted.push("bio");
  } else if (bio === "") {
    await User.updateOne({ _id: turn.ctx.userId }, { $set: { bio: "" } });
    turn.actions.push({ type: "refresh" });
    done.push("bio cleared");
  }
  if (args.public === false) {
    await User.updateOne({ _id: turn.ctx.userId }, { $set: { isPublic: false } });
    turn.actions.push({ type: "refresh" });
    done.push("private: out of Discover");
  } else if (args.public === true) {
    const handle = await handleOf(turn.ctx.userId);
    if (!handle && !done.length && !drafted.length) throw new Unable("Going public needs a handle first. Pick one in Settings.");
    if (handle) {
      turn.choices.push({
        label: "Make it public",
        detail: "People could find you in Discover and see what you share. Your pages stay private.",
        kind: "settings",
        tool: "go_public",
        args: {},
        editable: false,
        public: true,
        inputs: [],
        action: "",
      });
      turn.ask ??= "Make your profile public?";
    }
  }
  if (drafted.length) turn.ask ??= drafted.includes("bio") ? "Here’s a bio. Change anything, then save it." : "Your new name. Save it if it’s right.";
  if (done.length) receipt(turn, "settings", "Updated your profile", done.join(" · "), "/settings#profile");
  if (!done.length && !turn.choices.length) throw new Unable("Nothing to change on the profile.");
  return [drafted.length ? `Drafted the ${drafted.join(" and ")}: it's saved only when they tap it` : "", done.length ? `Profile: ${done.join("; ")}` : ""].filter(Boolean).join(". ") + ".";
}

async function setNames(turn: Turn, args: Args): Promise<string> {
  const yours = tidyName(str(args.yours) ?? "", COMPANION_NAME_MAX);
  const theirs = tidyName(str(args.theirs) ?? "", NICKNAME_MAX);
  const colour = COMPANION_COLOURS.find((c) => c.label.toLowerCase() === str(args.colour)?.toLowerCase());
  if (!yours && !theirs && !colour) throw new Unable("Give a name or a colour.");
  const set: Record<string, string | number | null> = {};
  if (yours) set.companionName = yours;
  if (theirs) set.nickname = theirs;
  if (colour) set.companionHue = colour.hue;
  await User.updateOne({ _id: turn.ctx.userId }, { $set: set });
  turn.actions.push({ type: "refresh" });
  turn.done.push(...nameReceipts(yours || null, theirs || null));
  if (colour) receipt(turn, "names", colour.hue === null ? "Back to vermilion" : `Wearing ${colour.label.toLowerCase()} now`, "Change it any time in Settings.", "/settings#kata", colour.hue);
  return [
    yours ? `You're called ${yours} now.` : "",
    theirs ? `You call them ${theirs} now.` : "",
    colour ? `You wear ${colour.label.toLowerCase()} now.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function setTheme(turn: Turn, args: Args): string {
  const theme = (["light", "dark", "system"] as const).find((t) => t === args.theme);
  if (!theme) throw new Unable("The theme can be light, dark or system.");
  turn.actions.push({ type: "theme", value: theme });
  receipt(turn, "settings", theme === "system" ? "Theme follows your system" : theme === "dark" ? "Dark mode on" : "Light mode on");
  return `Switched to ${theme === "system" ? "the system's theme" : `${theme} mode`}.`;
}

// ── People ────────────────────────────────────────────────────────────────────

async function shareMomentDraft(turn: Turn, args: Args): Promise<string> {
  // No words yet: an empty draft for them to write in.
  const text = (str(args.text) ?? "").slice(0, 500);
  if (!(await handleOf(turn.ctx.userId))) throw new Unable("Sharing needs a handle first. Pick one in Settings.");
  const kind = MOMENT_KINDS.find((k) => k === args.kind) ?? "thought";
  const visibility = VISIBILITIES.find((v) => v === args.visibility) ?? "public";
  const tags = [...new Set(list(args.tags).map(interest).filter(Boolean))].slice(0, 5);
  turn.choices.push({
    label: visibility === "public" ? "Share with everyone" : "Share with friends",
    detail: text,
    kind: "share",
    tool: "post_moment",
    args: { text, kind, visibility, tags },
    editable: true,
    public: true,
    inputs: [],
    action: "",
  });
  turn.ask = text ? "Here’s a draft. Change anything, then share it." : "What do you want to share?";
  return text ? "Drafted. It's shared only when they tap it." : "Gave them an empty draft to write in.";
}

/** A post by its number on the screen, or as it was when a choice to reply to it was offered. */
function postFrom(turn: Turn, args: Args): ScreenItem | null {
  const id = str(args.momentId);
  if (!id) return turn.screen.find((s) => s.n === Number(args.post)) ?? null;
  // Stored on a choice: checked when it was offered.
  const hue = typeof args.hue === "number" ? args.hue : 0;
  return { n: 0, momentId: id, name: str(args.to) ?? "them", handle: str(args.handle) ?? "", hue, isMine: false, kind: str(args.kind) ?? "post", text: str(args.postText) ?? "", replies: 0, at: new Date() };
}

/**
 * The model names the post's author as well as its number: posts are numbered afresh each
 * turn, and a reply meant for one post must never land on another. Without a name, the number
 * can only mean the one they're on, or the only one there.
 */
function wrongPost(turn: Turn, post: ScreenItem, args: Args): boolean {
  if (str(args.momentId)) return false;
  const to = str(args.to);
  if (to) return normalizeHandle(to) !== post.handle;
  return turn.screen.length > 1 && post.momentId !== turn.here;
}

async function draftReplies(turn: Turn, args: Args): Promise<string> {
  const post = postFrom(turn, args);
  if (!post) throw new Unable(`There's no post ${String(args.post)} on the screen.`);
  if (wrongPost(turn, post, args)) {
    throw new Unable(
      `Post ${post.n} is ${post.name}’s (@${post.handle}): ${quoted(post.text, 100)}.`,
      "Draft replies to what that post says, or use the right number, and give `to` as the author's @handle."
    );
  }
  if (post.isMine) throw new Unable("That's their own post.");
  const drafts = [...new Set(list(args.replies).map((r) => r.replace(/^["“]|["”]$/g, "").slice(0, 300)))].slice(0, 3);
  if (!drafts.length) throw new Unable("Replies need words.");
  for (const text of drafts) {
    turn.choices.push({
      label: "Post reply",
      detail: text,
      kind: "people",
      tool: "post_reply",
      args: { momentId: post.momentId, text, to: post.name, handle: post.handle, hue: post.hue },
      editable: true,
      public: true,
      inputs: [],
      action: "",
    });
  }
  turn.ask = `Replies to ${post.name}’s ${post.kind}, ${quoted(post.text, 60)}. Pick one, change it if you like:`;
  return "Drafted. Nothing is posted until they tap one.";
}

/** A private message for them to check and send: like a reply, it goes only on their tap. */
async function draftMessage(turn: Turn, args: Args): Promise<string> {
  const handle = normalizeHandle((str(args.to) ?? "").replace(/^@/, ""));
  const text = (str(args.text) ?? "").slice(0, 600);
  if (!handle) throw new Unable("Who to? Give their @handle.");
  const them = await User.findOne({ handle }).select("name handle").lean();
  if (!them?.handle) throw new Unable(`There's nobody called @${handle}.`);
  if (String(them._id) === turn.ctx.userId) throw new Unable("That's them.");
  const first = them.name.split(/\s+/)[0] || them.name;
  turn.choices.push({
    label: `Send to ${first}`,
    detail: text,
    kind: "message",
    tool: "send_message",
    args: { handle: them.handle, text, name: them.name },
    editable: true,
    public: true,
    inputs: [],
    action: "",
    max: 600,
  });
  turn.ask = `A message to ${them.name}. Change anything, then send it.`;
  return "Drafted. It's sent only when they tap it.";
}

async function followTool(turn: Turn, args: Args, how: typeof follow): Promise<string> {
  const handle = (str(args.handle) ?? "").replace(/^@/, "");
  if (!handle) throw new Unable("Whose handle?");
  const result = await how(turn.ctx.userId, handle);
  if (!result.ok) throw new Unable(result.status === 404 ? `There's nobody called @${handle}.` : result.error);
  turn.actions.push({ type: "refresh" });
  const p = result.value;
  const following = how === follow;
  receipt(turn, "people", following ? `Following ${p.name}` : `Unfollowed ${p.name}`, following && p.followsYou ? `@${p.handle} · you’re friends now` : `@${p.handle}`, `/u/${p.handle}`, p.hue);
  return following ? `Following ${p.name} (@${p.handle})${p.followsYou ? "; you're friends now" : ""}.` : `Stopped following ${p.name}.`;
}

async function clearNotifications(turn: Turn): Promise<string> {
  const { modifiedCount } = await Notification.updateMany({ userId: turn.ctx.userId, read: false }, { $set: { read: true } });
  turn.actions.push({ type: "refresh" });
  receipt(turn, "people", "Cleared your notifications", modifiedCount ? `${modifiedCount} marked read` : "Nothing was unread", "/notifications");
  return modifiedCount ? `Marked ${modifiedCount} notification${modifiedCount === 1 ? "" : "s"} read.` : "Nothing unread.";
}

// ── Breakdowns ────────────────────────────────────────────────────────────────

/** The stretches offered with one tap when they didn't say which; any other is a form. */
const QUICK_PERIODS: [label: string, period: string][] = [
  ["This week so far", "this week"],
  ["Last week", "last week"],
  ["This month", "this month"],
];

async function makeBreakdownTool(turn: Turn, args: Args): Promise<string> {
  const { ctx } = turn;
  const said = str(args.period);
  if (!said) {
    for (const [label, period] of QUICK_PERIODS) {
      turn.choices.push({ label, detail: "", kind: "breakdown", tool: "make_breakdown", args: { period }, editable: false, public: false, inputs: [], action: "" });
    }
    const others = PERIOD_IDEAS.filter((p) => !QUICK_PERIODS.some(([, q]) => q === p.toLowerCase()));
    turn.choices.push({
      label: "Another stretch",
      detail: "",
      kind: "breakdown",
      tool: "make_breakdown",
      args: {},
      editable: false,
      public: false,
      inputs: [input("period", "Stretch of time", "text", { required: true, options: ideas(others), placeholder: "September, since Oct 3" })],
      action: "Break it down",
    });
    turn.ask ??= "Which stretch of time?";
    return "They have choices for which stretch. Don't ask in words.";
  }
  const period = parsePeriod(said, ctx.day, localDay(ctx.tz, new Date(ctx.user.createdAt)));
  if (!period) {
    if (/\b(?:next|tomorrow|coming|upcoming)\b/i.test(said)) throw new Unable("That hasn’t happened yet.");
    throw new Unable(`I couldn’t tell which days “${said}” means.`, "Pass dates like 2026-10-01 to 2026-10-15, or leave period out so they can pick.");
  }
  const made = toBreakdownT(await askBreakdown(ctx, period));
  turn.changed = true;
  const r = breakdownReceipt(made, ctx.day);
  receipt(turn, r.kind, r.text, r.detail, r.href);
  return `Made the breakdown of ${periodTitle(made, made.upTo, ctx.day)}: ${scoreText(made.score)}, ${summaryLine(made.stats, made.parts)}.`;
}

// "Give me a breakdown", "break down last month", "how was my week": words alone settle these.
const BREAKDOWN_ASKED =
  /^(?:(?:can|could|would) you\s+|please\s+)*(?:(?:give|show|get|make|do|run|send)(?: me)?\s+(?:a\s+|my\s+|the\s+)?(?:quick\s+)?(?:break\s?down|report|recap|review|summary)|break\s?down|recap|review|summari[sz]e)\b(?:\s+(?:of|for|on|about|over))?\s*(.*?)[\s.!?]*$/i;
const HOW_WAS = /^(?:so\s+)?how (?:was|did|has|have)\s+(?:i\s+do(?:ne)?\s+)?(.+?)(?:\s+(?:go|gone|been))?[\s.!?]*$/i;

/** A message that only asks for a breakdown: the stretch it names (null for none), or null when it's something else. */
export function breakdownAsked(said: string, today: string): { period: string | null } | null {
  const s = said.trim();
  const asked = s.match(BREAKDOWN_ASKED);
  if (asked) {
    const rest = asked[1].replace(/(?:^|\s+)(?:please|for me|now|thanks)$/i, "").trim();
    if (!rest) return { period: null };
    return parsePeriod(rest, today) ? { period: rest } : null;
  }
  const how = s.match(HOW_WAS);
  return how && parsePeriod(how[1], today) ? { period: how[1] } : null;
}

/** Makes the breakdown they asked for in so many words, or offers the stretches when they named none. */
export async function breakdownTurn(turn: Turn, period: string | null): Promise<boolean> {
  try {
    await makeBreakdownTool(turn, period ? { period } : {});
    return true;
  } catch (err) {
    if (err instanceof Unable) return false;
    throw err;
  }
}

// ── Getting around ────────────────────────────────────────────────────────────

const PAGES: Record<string, string> = {
  home: "/dashboard",
  today: "/entry/new",
  pages: "/history",
  letters: "/digest/weekly",
  breakdowns: "/breakdowns",
  threads: "/threads",
  memories: "/threads#memories",
  people: "/people",
  discover: "/people?tab=discover",
  find_people: "/people?tab=find",
  notifications: "/notifications",
  gallery: "/templates",
  builder: "/settings/template",
  settings: "/settings",
};

async function openPage(turn: Turn, args: Args): Promise<string> {
  const page = str(args.page) ?? "";
  if (page === "profile") {
    const handle = (str(args.handle) ?? "").replace(/^@/, "").toLowerCase() || (await handleOf(turn.ctx.userId));
    if (!handle) throw new Unable("There's no handle yet, so no profile page. Pick one in Settings.");
    turn.actions.push({ type: "navigate", href: `/u/${handle}` });
    receipt(turn, "open", `Opened @${handle}`, "", `/u/${handle}`);
    return `Opening @${handle}.`;
  }
  const href = PAGES[page];
  if (!href) throw new Unable(`There's no page called ${page}.`);
  if (turn.where === href.split(/[?#]/)[0] && !/[?#]/.test(href)) return "They're already on that page.";
  turn.actions.push({ type: "navigate", href });
  receipt(turn, "open", `Opened ${page.replace("_", " ")}`, "", href);
  return `Opening ${page.replace("_", " ")}.`;
}

// "Open my letters", "take me to settings": words alone settle these, so they need no model.
const GO = /^(?:(?:can|could|would) you\s+|please\s+)*(?:open(?: up)?|show(?: me)?|take me(?: back)? to|go(?: back)?(?: to)?|bring up|jump to|head to)\s+(.+?)[\s.!?]*$/i;
const PLACES: Record<string, [page: string, name: string]> = {
  home: ["home", "Home"],
  dashboard: ["home", "Home"],
  today: ["today", "today’s page"],
  "today's": ["today", "today’s page"],
  page: ["today", "today’s page"],
  journal: ["today", "today’s page"],
  pages: ["pages", "your pages"],
  "past pages": ["pages", "your pages"],
  history: ["pages", "your pages"],
  letters: ["letters", "your letters"],
  letter: ["letters", "your letters"],
  "weekly letter": ["letters", "your letters"],
  "sunday letter": ["letters", "your letters"],
  breakdowns: ["breakdowns", "your breakdowns"],
  breakdown: ["breakdowns", "your breakdowns"],
  reports: ["breakdowns", "your breakdowns"],
  "weekly report": ["breakdowns", "your breakdowns"],
  "weekly reports": ["breakdowns", "your breakdowns"],
  threads: ["threads", "your threads"],
  map: ["threads", "your threads"],
  memories: ["memories", "what I remember"],
  people: ["people", "People"],
  feed: ["people", "People"],
  discover: ["discover", "Discover"],
  "find people": ["find_people", "Find people"],
  notifications: ["notifications", "your notifications"],
  gallery: ["gallery", "the gallery"],
  templates: ["gallery", "the gallery"],
  builder: ["builder", "the builder"],
  "page builder": ["builder", "the builder"],
  template: ["builder", "the builder"],
  settings: ["settings", "Settings"],
};

/** Where "open …" asks to go, if it names a page of the app (or someone's profile) exactly. */
export async function placeAsked(userId: string, said: string): Promise<{ href: string; name: string } | null> {
  const target = said.trim().match(GO)?.[1];
  if (!target) return null;
  const profile = target.match(/^@?([a-z0-9_]{3,24})(?:['’]s)?\s+profile$|^@([a-z0-9_]{3,24})$/i);
  if (profile) {
    const handle = normalizeHandle(profile[1] ?? profile[2]);
    return (await User.exists({ handle })) ? { href: `/u/${handle}`, name: `@${handle}’s profile` } : null;
  }
  const key = norm(target.replace(/’/g, "'")).replace(/(?:\s+(?:page|tab|screen|please|for me|now))+$/, "");
  if (key === "profile") {
    const handle = await handleOf(userId);
    return handle ? { href: `/u/${handle}`, name: "your profile" } : null;
  }
  const place = PLACES[key];
  return place ? { href: PAGES[place[0]], name: place[1] } : null;
}

// ── Choices ───────────────────────────────────────────────────────────────────

const KIND_OF: Record<string, ReceiptKind> = {
  update_thread: "thread",
  create_thread: "thread",
  log_thread: "thread",
  archive_thread: "thread",
  remember: "memory",
  write_on_page: "page",
  add_page_question: "question",
  remove_page_question: "question",
  rename_page_question: "question",
  use_page: "page",
  set_check_in: "settings",
  set_interests: "settings",
  set_names: "names",
  set_theme: "settings",
  follow: "people",
  unfollow: "people",
  open_page: "open",
  make_breakdown: "breakdown",
};

/** The specifics of a choice, from its arguments: which thread, when, what it would write. Not what its label says. */
function detailOf(tool: string, args: Args, label: string): string {
  const due = /^\d{4}-\d{2}-\d{2}$/.test(str(args.due) ?? "") ? `due ${shortDay(str(args.due)!)}` : "";
  const next = str(args.next_step) ? `next: ${str(args.next_step)}` : "";
  const values = args.values && typeof args.values === "object" ? Object.entries(args.values as Args) : [];
  const track = parseTrack(args.track);
  const parts: Record<string, (string | undefined)[]> = {
    create_thread: [str(args.title), str(args.kind), due, next, track.length ? `tracks ${track.map((f) => f.label.toLowerCase()).join(", ")}` : ""],
    update_thread: [str(args.thread), str(args.status), due, next, track.length ? `track ${track.map((f) => f.label.toLowerCase()).join(", ")}` : ""],
    log_thread: [str(args.thread), values.map(([k, v]) => valueText({ label: k, unit: "", type: typeof v === "number" ? "number" : "text" }, v as number | string)).join(", ")],
    archive_thread: [str(args.thread)],
    remember: [str(args.fact)],
    write_on_page: [str(args.text) ? quoted(str(args.text)!) : "", str(args.question)],
    add_page_question: [str(args.question)],
    remove_page_question: [str(args.question)],
    rename_page_question: [str(args.question) && str(args.to) ? `${str(args.question)} → ${str(args.to)}` : ""],
    set_check_in: [str(args.when)],
    set_interests: [[...list(args.add)].join(", "), list(args.remove).length ? `not ${list(args.remove).join(", ")}` : ""],
    set_theme: [str(args.theme)],
    follow: [str(args.handle) ? `@${str(args.handle)!.replace(/^@/, "")}` : ""],
    unfollow: [str(args.handle) ? `@${str(args.handle)!.replace(/^@/, "")}` : ""],
    open_page: [str(args.page)?.replace("_", " ")],
  };
  const said = norm(label);
  return (parts[tool] ?? [])
    .filter((part): part is string => Boolean(part) && !said.includes(norm(part!)))
    .join(" · ")
    .slice(0, 200);
}

// ── Forms ─────────────────────────────────────────────────────────────────────

/** A choice's form: its inputs, prefilled from the arguments, and the words around it. */
interface Form {
  inputs: IChoiceInput[];
  /** The choice's label. */
  label: string;
  /** Its button. */
  action: string;
  /** The line above it when it was offered because something was missing. */
  ask: string;
}

const KIND_WORD: Record<ThreadKind, string> = {
  project: "project",
  task: "task",
  goal: "goal",
  habit: "habit",
  person: "person",
  event: "event",
  health: "health goal",
  learning: "thing to learn",
  other: "thing",
};
const KIND_EXAMPLE: Record<ThreadKind, string> = {
  project: "Portfolio site",
  task: "Renew passport",
  goal: "Run a half marathon",
  habit: "Walk daily",
  person: "Call Grandma",
  event: "Mom’s birthday",
  health: "Sleep by 11",
  learning: "Learn Spanish",
  other: "What is it?",
};
const KIND_PICKS = THREAD_KINDS.filter((k) => k !== "other").map((k) => ({ label: capFirst(k), value: k }));
// Kinds with a date worth asking for.
const DATED = new Set<ThreadKind>(["event", "task", "goal"]);
const QUESTION_KINDS = [
  { label: "Writing", value: "text" },
  { label: "Short answer", value: "short_text" },
  { label: "Yes or no", value: "yes_no" },
  { label: "Rating", value: "rating" },
  { label: "Number", value: "number" },
];

/**
 * The form a tool's choice carries, prefilled from what the model gave: a tap runs it as it is
 * when nothing required is missing, and the form lets them change it first. Null for tools
 * that take no form (or when the thread or question it's about isn't there: the tool says so).
 */
async function formFor(turn: Turn, tool: string, args: Args): Promise<Form | null> {
  switch (tool) {
    case "create_thread": {
      const kind = THREAD_KINDS.find((k) => k === args.kind && k !== "other");
      const title = titleOf(args.title);
      const word = KIND_WORD[kind ?? "other"];
      const track = args.track === undefined ? (title ? guessFields(title, kind) : []) : parseTrack(args.track);
      const inputs = [
        input("title", kind ? capFirst(word) : "What is it?", "text", {
          value: title,
          options: title ? [] : ideas(list(args.ideas).map(titleOf).filter(Boolean).slice(0, 3)),
          required: true,
          placeholder: KIND_EXAMPLE[kind ?? "other"],
        }),
      ];
      if (!kind) inputs.push(input("kind", "Kind", "pick", { options: KIND_PICKS, value: kindSaid(turn.said) ?? "" }));
      if (!kind || TRACKED_KINDS.has(kind)) inputs.push(input("track", "Keep track of", "list", { value: track.map(specText).join(", ") }));
      if (kind && DATED.has(kind)) inputs.push(input("due", "Due", "date", { value: /^\d{4}-\d{2}-\d{2}$/.test(str(args.due) ?? "") ? str(args.due)! : "" }));
      return { inputs, label: title ? `Track ${title}` : `New ${word}`, action: "Track it", ask: kind ? `What’s the ${word}?` : "What should I keep track of?" };
    }
    case "log_thread": {
      const t = await findThread(turn.ctx, str(args.thread) ?? "");
      if (!t) return null;
      const values = args.values && typeof args.values === "object" ? (args.values as Args) : {};
      // Keeps nothing yet: what's usually worth a number for it.
      const fields = t.fields?.length ? t.fields : withFields([], guessFields(t.title));
      const choice = logChoice({ title: t.title, fields }, Object.fromEntries(Object.entries(values).map(([k, v]) => [closest(fields, k, (f) => f.label)?.label ?? k, v])));
      if (!choice) return null;
      return { inputs: choice.inputs, label: choice.label, action: choice.action, ask: "How did it go?" };
    }
    case "remember":
      return { inputs: [input("fact", "Remember", "text", { value: str(args.fact) ?? "", required: true, placeholder: "Ana is my sister" })], label: "Remember this", action: "Remember it", ask: "What should I remember?" };
    case "add_page_question":
      return {
        inputs: [
          input("question", "Question", "text", { value: str(args.question) ?? "", required: true, placeholder: "What did I learn today?" }),
          input("kind", "Answered with", "pick", { options: QUESTION_KINDS, value: QUESTION_KINDS.some((k) => k.value === args.kind) ? String(args.kind) : "text" }),
        ],
        label: str(args.question) ? `Ask “${str(args.question)!.slice(0, 40)}”` : "Add a question",
        action: "Add it",
        ask: "What should your page ask every day?",
      };
    case "rename_page_question": {
      if (str(args.to)) return null;
      const template = await activeTemplate(turn.ctx);
      const field = template ? closest(template.fields, str(args.question) ?? "", (f) => f.label) : null;
      if (!field) return null;
      return {
        inputs: [input("to", "New wording", "text", { required: true, placeholder: field.label })],
        label: `Reword “${field.label.slice(0, 40)}”`,
        action: "Change it",
        ask: `What should “${field.label}” say instead?`,
      };
    }
    case "write_on_page": {
      const template = await activeTemplate(turn.ctx);
      const writable = (template?.fields ?? []).filter((f) => WRITABLE.includes(f.type as FieldType));
      if (!writable.length) return null;
      const target = (str(args.question) ? closest(writable, str(args.question)!, (f) => f.label) : null) ?? writable[0];
      const inputs = [input("text", "Write", "text", { value: str(args.text) ?? "", required: true, placeholder: "In your words" })];
      if (writable.length > 1) inputs.push(input("question", "Under", "pick", { options: writable.slice(0, 6).map((f) => ({ label: f.label.slice(0, 60), value: f.label.slice(0, 60) })), value: target.label.slice(0, 60) }));
      return { inputs, label: "Write on today’s page", action: "Write it", ask: "What should I write?" };
    }
    case "set_check_in": {
      if (CHECK_INS.some((c) => c === args.when)) return null;
      const options = CHECK_INS.map((c) => ({ label: c === "both" ? "Morning and evening" : capFirst(c), value: c }));
      return { inputs: [input("when", "Check in", "pick", { options, required: true })], label: "Check-ins", action: "Save", ask: "When should I check in?" };
    }
    case "set_names": {
      if (str(args.yours) || str(args.theirs) || str(args.colour)) return null;
      return {
        inputs: [
          input("yours", "My name", "text", { options: ideas(NAME_IDEAS.filter((n) => n !== turn.ctx.companion).slice(0, 4)), placeholder: turn.ctx.companion }),
          input("theirs", "What I call you", "text", { placeholder: turn.ctx.first || "Your name" }),
        ],
        label: "Names",
        action: "Save names",
        ask: "What should we call each other?",
      };
    }
    default:
      return null;
  }
}

/** The tool's form, when it's missing something it needs: a choice to fill in instead of a question. */
async function askWithForm(turn: Turn, tool: string, args: Args): Promise<boolean> {
  const form = await formFor(turn, tool, args);
  if (!form || complete(form.inputs)) return false;
  turn.choices.push({ label: form.label, detail: "", kind: KIND_OF[tool] ?? "open", tool, args, editable: false, public: false, inputs: form.inputs, action: form.action });
  turn.ask ??= form.ask;
  return true;
}

// "Draft replies to Arjun", "Suggest a reply": an offer to do what draft_replies does.
const DRAFTS = /\b(?:draft|write|suggest|give me)\b.*\brepl(?:y|ies)\b/i;

// There's always a "Not now" under the choices, so a choice that only says no is dropped.
const DECLINES = /^(?:no(?:\s+thanks)?|not now|nothing(?: for now)?|do nothing(?: for now)?|skip(?: it)?|leave it|maybe later|later)[.!]?$/i;

async function offerChoices(turn: Turn, args: Args): Promise<string> {
  const offered = Array.isArray(args.choices) ? (args.choices as unknown[]).slice(0, 4) : [];
  const tracked: string[] = [];
  let here = false;
  for (const raw of offered) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as { label?: unknown; do?: { tool?: unknown; args?: unknown } };
    const label = (str(c.label) ?? "").slice(0, 60);
    if (!label) continue;
    const tool = str(c.do?.tool);
    if (!tool) {
      if (label.length <= 32) turn.replies.push(label);
      continue;
    }
    const toolArgs = c.do?.args && typeof c.do.args === "object" ? (c.do.args as Args) : {};
    if (tool === "draft_replies") {
      // Keep the post itself, so the tap later works without the screen.
      const post = postFrom(turn, toolArgs);
      if (!post || post.isMine || wrongPost(turn, post, toolArgs) || !list(toolArgs.replies).length) continue;
      const { momentId, name: to, handle, hue, kind, text } = post;
      const stored = { momentId, to, handle, hue, kind, postText: text.slice(0, 200), replies: list(toolArgs.replies).slice(0, 3) };
      turn.choices.push({ label, detail: `${to}’s ${kind}: ${quoted(text, 80)}`, kind: "people", tool, args: stored, editable: false, public: false, inputs: [], action: "" });
      continue;
    }
    if (!CHOOSABLE.includes(tool)) continue;
    // Opening the page they're already on does nothing, and starting what's already tracked isn't new.
    if (tool === "open_page" && turn.where && PAGES[str(toolArgs.page) ?? ""] === turn.where) {
      here = true;
      continue;
    }
    if (tool === "create_thread" && titleOf(toolArgs.title) && (await Thread.exists({ userId: turn.ctx.userId, key: threadKey(titleOf(toolArgs.title)), archived: false }))) {
      tracked.push(titleOf(toolArgs.title));
      continue;
    }
    // What it needs that the model didn't know becomes a form on the choice; the rest can be changed in it.
    const form = await formFor(turn, tool, toolArgs);
    turn.choices.push({
      label,
      detail: detailOf(tool, toolArgs, label),
      kind: KIND_OF[tool] ?? "open",
      tool,
      args: toolArgs,
      editable: false,
      public: false,
      inputs: form?.inputs ?? [],
      action: form?.action ?? "",
    });
  }
  turn.replies = (turn.choices.length ? turn.replies.filter((r) => !DECLINES.test(r)) : turn.replies).slice(0, 3);
  const ask = str(args.ask);
  if (ask && (turn.choices.length || turn.replies.length)) turn.ask = ask.slice(0, 200);
  // Offering to draft replies, with the post right there, is a step they shouldn't have to take.
  const offersDrafts = turn.screen.length > 0 && turn.replies.some((r) => DRAFTS.test(r));
  // Only "no" (or "shall I draft?") left to tap is nothing to offer: the model hears why and tries again.
  if (!turn.choices.length && !turn.replies.some((r) => !DECLINES.test(r) && !(offersDrafts && DRAFTS.test(r)))) {
    turn.replies = [];
    turn.ask = null;
    const why = [
      tracked.length ? `They already track ${tracked.join(", ")}: offer something new, or a form without a title.` : "",
      here ? "They're already on that page: what they mean is on their screen, so answer about it or act on it." : "",
      offersDrafts ? "Don't offer to draft replies: call draft_replies for that post now." : "",
    ];
    throw new Unable("Nothing to offer.", why.filter(Boolean).join(" "));
  }
  return tracked.length ? `Offered. Left out what they already track: ${tracked.join(", ")}.` : "Offered.";
}

// Run only from a choice the writer tapped, never by the model directly.
async function postMoment(turn: Turn, args: Args): Promise<string> {
  const text = (str(args.text) ?? "").slice(0, 500);
  if (!text) throw new Unable("A moment needs words.");
  if (!(await checkLimit(limiters.moment, `moment:${turn.ctx.userId}`)).ok) throw new Unable("That's a lot of moments for one hour. Try again later.");
  const result = await shareMoment(turn.ctx.userId, {
    text,
    kind: MOMENT_KINDS.find((k) => k === args.kind) ?? "thought",
    visibility: VISIBILITIES.find((v) => v === args.visibility) ?? "public",
    tags: list(args.tags).slice(0, 5),
  });
  if (!result.ok) throw new Unable(result.error);
  const m = result.value;
  turn.actions.push({ type: "refresh" });
  receipt(turn, "share", m.visibility === "public" ? "Shared with everyone" : "Shared with your friends", quoted(text), `/u/${m.author.handle}/m/${m._id}`, m.author.hue);
  return "Shared.";
}

async function postReply(turn: Turn, args: Args): Promise<string> {
  const text = (str(args.text) ?? "").slice(0, 500);
  if (!text) throw new Unable("A reply needs words.");
  if (!(await checkLimit(limiters.reply, `reply:${turn.ctx.userId}`)).ok) throw new Unable("That's a lot of replies for one hour. Try again later.");
  const momentId = str(args.momentId) ?? "";
  const result = await replyTo(turn.ctx.userId, momentId, text);
  if (!result.ok) throw new Unable(result.status === 404 ? "That post isn't there any more." : result.error);
  const handle = str(args.handle);
  // The post on screen shows the reply at once, with the count as it is now.
  const count = (await Moment.findById(momentId).select("replyCount").lean())?.replyCount ?? null;
  turn.actions.push({ type: "replied", momentId, reply: result.value, count });
  receipt(turn, "people", `Replied to ${str(args.to) ?? "them"}`, quoted(text), handle ? `/u/${handle}/m/${momentId}` : null, typeof args.hue === "number" ? args.hue : null);
  return "Replied.";
}

async function saveProfile(turn: Turn, args: Args): Promise<string> {
  const field = args.field === "name" ? "name" : "bio";
  const text = (str(args.text) ?? "").replace(/\s+/g, " ").slice(0, PROFILE_MAX[field]);
  if (!text) throw new Unable(field === "name" ? "A name needs words." : "A bio needs words.");
  await User.updateOne({ _id: turn.ctx.userId }, { $set: { [field]: text } });
  turn.actions.push({ type: "refresh" });
  const handle = await handleOf(turn.ctx.userId);
  receipt(turn, "settings", field === "name" ? "Changed your name" : "Updated your bio", quoted(text), handle ? `/u/${handle}` : "/settings#profile");
  return "Saved.";
}

// Run only from a choice the writer tapped, never by the model directly.
async function sendMessageTool(turn: Turn, args: Args): Promise<string> {
  const handle = str(args.handle) ?? "";
  if (!(await checkLimit(limiters.message, `message:${turn.ctx.userId}`)).ok) throw new Unable("That's a lot of messages for one hour. Try again later.");
  const sent = await sendMessage(turn.ctx.userId, handle, str(args.text) ?? "");
  if (!sent.ok) throw new Unable(sent.error);
  receipt(turn, "message", `Sent to ${str(args.name) ?? `@${handle}`}`, quoted(sent.value.text), `/messages/${handle}`);
  return "Sent.";
}

async function goPublic(turn: Turn): Promise<string> {
  const handle = await handleOf(turn.ctx.userId);
  if (!handle) throw new Unable("Going public needs a handle first. Pick one in Settings.");
  await User.updateOne({ _id: turn.ctx.userId }, { $set: { isPublic: true } });
  turn.actions.push({ type: "refresh" });
  receipt(turn, "settings", "Your profile is public", "People can find you in Discover. Your pages stay private.", `/u/${handle}`);
  return "Public.";
}

// ── Running them ──────────────────────────────────────────────────────────────

type Tool = (turn: Turn, args: Args) => string | Promise<string>;

const RUN: Record<string, Tool> = {
  update_thread: updateThread,
  create_thread: createThreadTool,
  log_thread: logThread,
  archive_thread: archiveThread,
  remember,
  forget,
  search_pages: searchPages,
  offer_choices: offerChoices,
  open_page: openPage,
  write_on_page: writeOnPage,
  add_page_question: addPageQuestion,
  remove_page_question: removePageQuestion,
  use_page: usePage,
  make_breakdown: makeBreakdownTool,
  rename_page_question: renamePageQuestion,
  set_check_in: setCheckIn,
  set_interests: setInterests,
  update_profile: updateProfile,
  set_names: setNames,
  set_theme: setTheme,
  share_moment: shareMomentDraft,
  draft_message: draftMessage,
  draft_replies: draftReplies,
  follow: (turn, args) => followTool(turn, args, follow),
  unfollow: (turn, args) => followTool(turn, args, unfollow),
  clear_notifications: clearNotifications,
};

/** What only a tap can run. */
const COMMIT: Record<string, Tool> = { post_moment: postMoment, post_reply: postReply, go_public: goPublic, save_profile: saveProfile, send_message: sendMessageTool };

/**
 * Runs one tool call from the model. ok is false when nothing happened, or when the result
 * is something to read (search_pages): then Maru answers from the result, not from what it
 * said alongside the call.
 */
export async function runTool(turn: Turn, call: ChatCompletionMessageToolCall): Promise<{ out: string; ok: boolean }> {
  const name = call.function.name;
  const run = RUN[name];
  if (!run) return { out: `There is no tool called ${name}.`, ok: false };
  let args: Args;
  try {
    const parsed: unknown = JSON.parse(call.function.arguments || "{}");
    args = parsed && typeof parsed === "object" ? (parsed as Args) : {};
  } catch {
    return { out: "Those arguments weren't valid JSON.", ok: false };
  }
  try {
    // Missing something it needs: they get a form for it instead of a question.
    if (CHOOSABLE.includes(name) && (await askWithForm(turn, name, args))) {
      return { out: "They have a form to fill in for that. Don't ask for it in words.", ok: true };
    }
    const out = await run(turn, args);
    return { out, ok: name !== "search_pages" };
  } catch (err) {
    if (err instanceof Unable) return { out: err.hint ? `${err.message} ${err.hint}` : err.message, ok: false };
    throw err;
  }
}

/**
 * The writer tapped a choice: run it as stored, with what they filled in on its form, or their
 * edit to its words if it takes one.
 */
export async function runChoice(
  turn: Turn,
  choice: IChoice,
  edit?: string,
  filled?: Record<string, string>
): Promise<{ ok: true } | { ok: false; why: string }> {
  const run = COMMIT[choice.tool] ?? ([...CHOOSABLE, "draft_replies"].includes(choice.tool) ? RUN[choice.tool] : undefined);
  if (!run) return { ok: false, why: "That can’t be done from here any more." };
  const applied = applyInputs(choice, filled);
  if ("why" in applied) return { ok: false, why: applied.why };
  const args = choice.editable && edit?.trim() ? { ...applied.args, text: edit.trim() } : applied.args;
  try {
    // A choice stored before it had a form, still missing something: the form comes now.
    if (!choice.inputs?.length && CHOOSABLE.includes(choice.tool) && (await askWithForm(turn, choice.tool, args))) return { ok: true };
    await run(turn, args);
    return { ok: true };
  } catch (err) {
    if (err instanceof Unable) return { ok: false, why: err.message };
    throw err;
  }
}
