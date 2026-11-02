// Example content for the landing page. Every person, thread and page here is an
// example and is labelled as one on the page: never real users, counts or quotes.

import type { ReactionKind, ThreadStatus } from "@/lib/types";

// ── The hero: one morning's check-in ────────────────────────────────────────

export interface Reply {
  label: string;
  value: string;
}

export interface Line {
  id: string;
  from: "kata" | "you";
  text: string;
  replies?: Reply[];
  /** Shows the five-step mood check under the line. */
  mood?: boolean;
}

export const MOODS: Reply[] = [
  { value: "1", label: "Foggy" },
  { value: "2", label: "Low" },
  { value: "3", label: "Okay" },
  { value: "4", label: "Good" },
  { value: "5", label: "Bright" },
];

/** What Kata says before the visitor does anything. */
export const OPENING: Line[] = [
  { id: "hi", from: "kata", text: "Morning. That’s five days in a row." },
  { id: "mood", from: "kata", text: "How’s your head today?", mood: true },
  {
    id: "webhook",
    from: "kata",
    text: "Yesterday the payments webhook was waiting on review. Did it land?",
    replies: [
      { label: "It landed", value: "done" },
      { label: "Still waiting", value: "waiting" },
      { label: "Moving again", value: "moving" },
      { label: "Drop it", value: "paused" },
    ],
  },
];

export const MOOD_REPLY: Record<string, string> = {
  "1": "Foggy days happen. Keep today small.",
  "2": "Noted. One thing at a time today.",
  "3": "Okay is fine. What would make it good?",
  "4": "Good. Let’s spend it on the hard thing.",
  "5": "Bright. Spend it on the webhook.",
};

export const WEBHOOK_REPLY: Record<string, string> = {
  done: "Nice. Three days on that one. I’ve marked it done.",
  waiting: "Still on review, then. I’ll ask again tomorrow.",
  moving: "Good. What’s the next step?",
  paused: "Parked. I’ll stop asking about it.",
};

export const JOBS_CHECK: Line = {
  id: "jobs",
  from: "kata",
  text: "And the job hunt: Stripe wrote back on Tuesday. Is Monday’s call booked?",
  replies: [
    { label: "Booked", value: "booked" },
    { label: "Not yet", value: "later" },
    { label: "Help me prep", value: "prep" },
  ],
};

export const JOBS_REPLY: Record<string, string> = {
  booked: "Then I’ll put two prep questions on today’s page.",
  later: "I’ll bring it up again tonight.",
  prep: "Start here: what should they remember after the call?",
};

export const SIGN_OFF = "That’s this morning. Today’s page is ready when you are.";

// ── The map: what one day's notes turn into ─────────────────────────────────

export type ThreadId = "webhook" | "jobs" | "sleep" | "mom" | "gym" | "rust";

export interface MapThread {
  id: ThreadId;
  title: string;
  status: ThreadStatus;
  hue: number;
  /** What fits on the sticker under the title. */
  meta: string;
  /** How much room it takes on the map: 3 is on your mind most. */
  weight: 1 | 2 | 3;
  /** Centre on the map, in percent. */
  x: number;
  y: number;
  tilt: number;
}

export const THREADS: MapThread[] = [
  { id: "webhook", title: "Payments webhook", status: "waiting", hue: 0, meta: "3 days", weight: 3, x: 25, y: 30, tilt: -6 },
  { id: "jobs", title: "Job hunt", status: "moving", hue: 2, meta: "2 this week", weight: 3, x: 75, y: 28, tilt: 5 },
  { id: "rust", title: "Learn Rust", status: "paused", hue: 4, meta: "2 weeks", weight: 1, x: 50, y: 10, tilt: -3 },
  { id: "sleep", title: "Sleep", status: "stuck", hue: 5, meta: "5h 40m", weight: 2, x: 19, y: 71, tilt: 7 },
  { id: "mom", title: "Mom’s birthday", status: "moving", hue: 1, meta: "Friday", weight: 2, x: 50, y: 86, tilt: 3 },
  { id: "gym", title: "Gym", status: "moving", hue: 3, meta: "4 days", weight: 2, x: 81, y: 70, tilt: -4 },
];

/** One day's page, in the writer's words. Marked phrases become threads. */
export const NOTE: (string | { thread: ThreadId; text: string })[] = [
  { thread: "webhook", text: "Webhook PR" },
  " still waiting on review. Applied to two more places and ",
  { thread: "jobs", text: "Stripe wrote back" },
  ". ",
  { thread: "sleep", text: "Slept badly again" },
  ", phone until 1. Order ",
  { thread: "mom", text: "Mom’s teapot" },
  " before Friday. ",
  { thread: "gym", text: "Legs at the gym" },
  ". Didn’t open ",
  { thread: "rust", text: "the Rust book" },
  ".",
];

export const STUCK_ASK = "Sleep’s been stuck three nights now. What time did the screen go off last night?";

export const STEPS = [
  "You write a few lines.",
  "Maru picks out what’s on your mind.",
  "Each one becomes a thread on your map.",
  "Then it asks about the stuck one.",
];

// ── Today's page: questions filed under tags ────────────────────────────────

export const QUESTIONS = [
  {
    id: "q1",
    tag: "webhook",
    hue: 0,
    from: "From a thread",
    text: "What’s the one thing still standing between you and merging?",
    answer: "Review. I’ll ask in standup instead of waiting.",
  },
  {
    id: "q2",
    tag: "job-hunt",
    hue: 2,
    from: "From a thread",
    text: "What do you want them to remember after Monday’s call?",
    answer: "",
  },
  {
    id: "q3",
    tag: "sleep",
    hue: 5,
    from: "Stuck for three nights",
    text: "What time did the screen actually go off last night?",
    answer: "",
  },
];

/** Interests a writer follows; Kata asks about these too. */
export const INTERESTS = [
  { tag: "reading", hue: 6 },
  { tag: "running", hue: 3 },
  { tag: "cooking", hue: 7 },
];

// ── People ──────────────────────────────────────────────────────────────────

export interface ExamplePerson {
  name: string;
  handle: string;
  role: string;
  hue: number;
}

export const PEOPLE: Record<string, ExamplePerson> = {
  mira: { name: "Mira Okafor", handle: "mira", role: "Designer", hue: 5 },
  priya: { name: "Priya Nair", handle: "priya", role: "Job seeker", hue: 2 },
  kenji: { name: "Kenji Mori", handle: "kenji", role: "Developer", hue: 6 },
  arjun: { name: "Arjun Rao", handle: "arjun", role: "Founder", hue: 7 },
  lena: { name: "Lena Fischer", handle: "lena", role: "Student", hue: 4 },
  theo: { name: "Theo Lindqvist", handle: "theo", role: "Writer", hue: 3 },
};

export const REACTIONS: { kind: ReactionKind; label: string }[] = [
  { kind: "nice", label: "Nice" },
  { kind: "same", label: "Same" },
  { kind: "go", label: "Go on" },
  { kind: "hug", label: "Hug" },
];

export const MOMENTS = [
  { id: "m1", who: "mira", kind: "Finished", when: "2h", tag: "design", text: "The new onboarding is live. Three screens instead of nine." },
  { id: "m2", who: "priya", kind: "Win", when: "5h", tag: "job-hunt", text: "Second interview at the place I actually want. Monday at ten." },
  { id: "m3", who: "kenji", kind: "Thought", when: "1d", tag: "shipping", text: "Found the flaky test. It was the clock. It is always the clock." },
];

export const WORKING_ON: { who: string; title: string; status: ThreadStatus; when: string }[] = [
  { who: "arjun", title: "Seed round", status: "moving", when: "1h" },
  { who: "lena", title: "Thesis draft", status: "stuck", when: "3h" },
  { who: "theo", title: "Chapter three", status: "moving", when: "6h" },
  { who: "priya", title: "Job hunt", status: "moving", when: "1d" },
];
