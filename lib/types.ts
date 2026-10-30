export type FieldType =
  | "short_text"
  | "long_text"
  | "mood_slider"
  | "energy"
  | "number"
  | "tags"
  | "yes_no"
  | "rating"
  | "link"
  | "divider";

export type FieldValue = string | number | boolean | string[] | null;

export interface FieldConfig {
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  unit?: string;
  min?: number;
  max?: number;
  emojis?: string[]; // for mood_slider
  yesLabel?: string;
  noLabel?: string;
  allowedTags?: string[];
  freeForm?: boolean;
  sectionLabel?: string;
}

export interface TemplateField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  order: number;
  config: FieldConfig;
}

export interface Template {
  _id?: string;
  userId?: string;
  name: string;
  description: string;
  isPublished: boolean;
  publishedSlug: string | null;
  cloneCount: number;
  clonedFrom: string | null;
  tags: string[];
  fields: TemplateField[];
  createdAt?: string;
  updatedAt?: string;
}

/** One of the writer's own page layouts, as their library lists it. */
export interface OwnPageT {
  _id: string;
  name: string;
  questions: number;
  /** Today's page: the one they fill in now. */
  active: boolean;
  /** Copied from someone's page in the gallery. */
  fromGallery: boolean;
  published: boolean;
  /** How many days' pages were written with it. */
  written: number;
  /** The last day one was, yyyy-mm-dd. */
  lastWritten: string | null;
  updatedAt: string;
}

export interface EntryField {
  fieldId: string;
  type: FieldType;
  label: string;
  value: FieldValue;
}

export interface Entry {
  _id?: string;
  userId?: string;
  templateId?: string;
  date: string; // ISO yyyy-mm-dd at midnight UTC
  fields: EntryField[];
  wordCount: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * What fills someone's days, as onboarding asks it: work of every kind and the rest of life,
 * so Kata is for everyone, not only people at desks. "custom" is "Something else".
 */
export const ROLE_KEYS = [
  "developer",
  "designer",
  "founder",
  "freelancer",
  "teacher",
  "healthcare",
  "shift_worker",
  "creative",
  "student",
  "job_seeker",
  "parent",
  "athlete",
  "wellbeing",
  "retired",
  "custom",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export interface RolePreset {
  key: RoleKey;
  name: string;
  emoji: string;
  description: string;
  fields: Omit<TemplateField, "id" | "order">[];
}

export interface DigestSummary {
  _id: string;
  type: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  content: string;
  entryCount: number;
  wordCount: number;
  isRead: boolean;
  createdAt: string;
}

export interface UserStats {
  streak: number;
  longestStreak: number;
  totalEntries: number;
  totalWords: number;
  averageWords: number;
  contributions: { date: string; wordCount: number }[];
}

// ── Kata's companion and mental model ───────────────────────────────────────

export type ThreadKind =
  | "project"
  | "task"
  | "goal"
  | "habit"
  | "person"
  | "event"
  | "health"
  | "learning"
  | "other";

export type ThreadStatus = "moving" | "stuck" | "waiting" | "done" | "paused";

/** Something a thread keeps a value on: minutes walked, guests coming. */
export interface ThreadField {
  key: string;
  label: string;
  type: "number" | "text";
  unit: string;
  goal: number | null;
  value: number | string | null;
  /** When the latest value was set. */
  at: string | null;
  /** Numbers: the latest days that have one (at most 14), oldest first. */
  days: { day: string; value: number }[];
}

/** One ongoing thing Kata keeps track of, as the client sees it. */
export interface ThreadT {
  _id: string;
  title: string;
  kind: ThreadKind;
  status: ThreadStatus;
  tags: string[];
  nextStep: string;
  lastNote: string;
  dueAt: string | null;
  lastTouchedAt: string;
  touchCount: number;
  streak: number;
  hue: number;
  shared: boolean;
  log: { at: string; text: string; status: ThreadStatus | null; from: "you" | "kata" | "page" }[];
  fields: ThreadField[];
}

export interface QuickReply {
  label: string;
  value: string;
}

export type ReceiptKind = "thread" | "memory" | "page" | "question" | "settings" | "names" | "people" | "share" | "message" | "breakdown" | "open";

/** Something Maru did. */
export interface Receipt {
  kind: ReceiptKind;
  text: string;
  detail: string;
  href: string | null;
  hue: number | null;
}

/** One thing a choice needs filled in, or lets the writer change, before it runs. */
export interface ChoiceInput {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "pick" | "list";
  value: string;
  options: { label: string; value: string }[];
  required: boolean;
  unit: string;
  placeholder: string;
}

/** Something Maru offers to do; the tool behind it stays on the server. */
export interface Choice {
  label: string;
  detail: string;
  kind: ReceiptKind;
  editable: boolean;
  public: boolean;
  /** A form to fill in (or change) before it runs. */
  inputs: ChoiceInput[];
  /** The form's button. */
  action: string;
  /** An editable draft's longest length; 0 for the usual 500. */
  max: number;
}

export interface KataMessage {
  _id: string;
  from: "kata" | "you";
  kind: "greeting" | "mood" | "checkin" | "question" | "reply" | "note" | "nudge";
  text: string;
  threadId: string | null;
  replies: QuickReply[];
  answer: string | null;
  mood: number | null;
  done: Receipt[];
  choices: Choice[];
  createdAt: string;
}

/** A question Kata adds to today's page, filed under a tag. */
export interface DailyQuestion {
  id: string;
  text: string;
  tag: string;
  threadId: string | null;
}

// ── People ──────────────────────────────────────────────────────────────────

export type MomentKind = "win" | "ship" | "thought" | "question" | "milestone" | "page";
export type Visibility = "public" | "friends";
export type ReactionKind = "nice" | "same" | "go" | "hug";

export interface PersonT {
  handle: string;
  name: string;
  bio: string;
  role: string;
  hue: number;
  followerCount: number;
  followingCount: number;
  /** Relative to the viewer. */
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
}

export interface MomentT {
  _id: string;
  author: Pick<PersonT, "handle" | "name" | "hue" | "role">;
  text: string;
  kind: MomentKind;
  tags: string[];
  threadTitle: string | null;
  visibility: Visibility;
  reactions: Record<ReactionKind, number>;
  /** Reactions the viewer has given. */
  mine: ReactionKind[];
  replyCount: number;
  isMine: boolean;
  createdAt: string;
}

export interface ReplyT {
  _id: string;
  author: Pick<PersonT, "handle" | "name" | "hue">;
  text: string;
  isMine: boolean;
  createdAt: string;
}

/** A conversation with someone, as the list of messages shows it. */
export interface ConversationT {
  person: Pick<PersonT, "handle" | "name" | "hue">;
  lastText: string;
  lastFromMe: boolean;
  lastAt: string;
  unread: number;
  /** The viewer blocked them. */
  blocked: boolean;
}

export interface DirectMessageT {
  _id: string;
  text: string;
  mine: boolean;
  createdAt: string;
}

/** A conversation opened: who, what was said, and whether the viewer can write. */
export interface ThreadOpenT {
  person: Pick<PersonT, "handle" | "name" | "hue">;
  messages: DirectMessageT[];
  /** Older messages exist before the first one here. */
  more: boolean;
  /** Why they can't write, when they can't. */
  closed: string | null;
  blocked: boolean;
}

export interface NotificationT {
  _id: string;
  kind: "follow" | "reaction" | "reply";
  actor: Pick<PersonT, "handle" | "name" | "hue">;
  momentId: string | null;
  momentText: string | null;
  reaction: ReactionKind | null;
  read: boolean;
  createdAt: string;
}

// ── Breakdowns ────────────────────────────────────────────────────────────────

/** How a stretch steps back for a comparison: the week before, the month before, the same number of days before. */
export type PeriodUnit = "day" | "week" | "month" | "year" | "days";

/** A thread as a breakdown keeps it: what it was called then. */
export interface BreakdownThread {
  id: string;
  title: string;
  hue: number;
  kind: ThreadKind;
}

/** What happened in a stretch of days, worked out from what the writer logged. Days are yyyy-mm-dd. */
export interface BreakdownStats {
  /** Days counted. */
  days: number;
  /** Days with anything at all: a page, a check-in, a habit, a number, an update, a post. */
  active: string[];
  done: BreakdownThread[];
  /** Updated and not stuck at the end, the busiest first. */
  moved: (BreakdownThread & { updates: number })[];
  started: BreakdownThread[];
  /** Stuck at the end of the stretch. */
  stuck: BreakdownThread[];
  /** Counted from `since` (the later of the stretch's start and the habit's); `of` days in all. */
  habits: (BreakdownThread & { days: string[]; of: number; since: string })[];
  numbers: {
    thread: BreakdownThread;
    label: string;
    unit: string;
    total: number;
    days: number;
    goal: number | null;
    /** Days it reached the goal. */
    hit: number;
    values: { day: string; value: number }[];
  }[];
  pages: { days: string[]; words: number };
  /** 1 (foggy) to 5 (bright), the day's last answer. */
  moods: { day: string; mood: number }[];
  people: { moments: number; replies: number };
  /** Threads other than habits that were open during the stretch. */
  open: number;
}

/** The score's three parts, each 0–1; null when there's nothing to judge it by. */
export interface BreakdownParts {
  showingUp: number | null;
  progress: number | null;
  habits: number | null;
}

export interface BreakdownT {
  _id: string;
  kind: "weekly" | "asked";
  from: string;
  to: string;
  unit: PeriodUnit;
  /** What was counted: from the later of `from` and the day they joined, up to the day it was made. */
  counted: string;
  upTo: string;
  score: number | null;
  parts: BreakdownParts;
  stats: BreakdownStats;
  previous: { from: string; upTo: string; score: number | null } | null;
  take: string;
  /** Asked ones go on this day unless kept; null when kept. */
  expiresAt: string | null;
  madeAt: string;
}
