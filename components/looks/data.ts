// Demo content for the /looks preview: the same home screen in each candidate look.
// Fictional people and threads; nothing here is real user data.

import type { ReactionKind, ThreadKind, ThreadStatus } from "@/lib/types";

export type LookId = "sticker" | "night" | "daylight";
export type Mode = "light" | "dark";

export const LOOKS: { id: LookId; name: string; line: string; mode: Mode }[] = [
  { id: "sticker", name: "Sticker book", line: "Bold colour, ink outlines, stickers and stamps. Loud and friendly.", mode: "light" },
  { id: "night", name: "Night shift", line: "A dark cockpit where Kata’s map of your life glows. Focused and techy.", mode: "dark" },
  { id: "daylight", name: "Daylight", line: "Soft colour, round shapes, a warm serif and lots of air. Calm and kind.", mode: "light" },
];

export interface DemoThread {
  id: string;
  title: string;
  kind: ThreadKind;
  status: ThreadStatus;
  hue: number;
  note: string;
  next: string;
  meta: string;
  /** What fits on the map. */
  short: string;
  /** How much room it takes on the map: 3 is on your mind most. */
  weight: 1 | 2 | 3;
  /** Centre on the map, in percent. */
  x: number;
  y: number;
  tilt: number;
}

export const THREADS: DemoThread[] = [
  { id: "webhook", title: "Payments webhook", kind: "project", status: "waiting", hue: 0, note: "Waiting on Sam’s review since Tuesday.", next: "Merge it and watch the retries", meta: "3 days", short: "3 days", weight: 3, x: 25, y: 31, tilt: -6 },
  { id: "jobs", title: "Job hunt", kind: "goal", status: "moving", hue: 2, note: "Two applications this week. Stripe wrote back.", next: "Prep for Monday’s call", meta: "2 this week", short: "2 this week", weight: 3, x: 75, y: 29, tilt: 5 },
  { id: "gym", title: "Gym", kind: "habit", status: "moving", hue: 3, note: "Legs yesterday.", next: "Push day", meta: "4-day streak", short: "4 days", weight: 2, x: 82, y: 71, tilt: -4 },
  { id: "mom", title: "Mom’s birthday", kind: "event", status: "moving", hue: 1, note: "She liked the blue teapot at the market.", next: "Order it by Wednesday", meta: "Friday", short: "Friday", weight: 2, x: 50, y: 86, tilt: 3 },
  { id: "sleep", title: "Sleep", kind: "health", status: "stuck", hue: 5, note: "Under six hours three nights running.", next: "Screens off at 11", meta: "5h 40m a night", short: "5h 40m", weight: 2, x: 18, y: 72, tilt: 7 },
  { id: "rust", title: "Learn Rust", kind: "learning", status: "paused", hue: 4, note: "Stopped at chapter 8, lifetimes.", next: "One exercise, no more", meta: "Paused 2 weeks", short: "2 weeks", weight: 1, x: 50, y: 12, tilt: -3 },
];

export const STATUS_LABEL: Record<ThreadStatus, string> = {
  moving: "Moving",
  stuck: "Stuck",
  waiting: "Waiting",
  done: "Done",
  paused: "Paused",
};

export const KIND_LABEL: Record<ThreadKind, string> = {
  project: "Project",
  task: "Task",
  goal: "Goal",
  habit: "Habit",
  person: "Person",
  event: "Event",
  health: "Health",
  learning: "Learning",
  other: "Thread",
};

export interface Line {
  id: string;
  from: "kata" | "you";
  text: string;
  replies?: { label: string; value: string }[];
  mood?: boolean;
}

export const OPENING = (first: string): Line[] => [
  { id: "hi", from: "kata", text: `Morning, ${first}. Five days in a row now.` },
  {
    id: "webhook",
    from: "kata",
    text: "Yesterday the payments webhook was still waiting on Sam’s review. Did it land?",
    replies: [
      { label: "It landed", value: "done" },
      { label: "Still waiting", value: "waiting" },
      { label: "Moving again", value: "moving" },
      { label: "Drop it", value: "paused" },
    ],
  },
];

export const FOLLOW_UP: Record<string, string> = {
  done: "Nice. Three days on that one. I’ll take it off your mind.",
  waiting: "Still on Sam, then. I’ll ask again tomorrow.",
  moving: "Good. What’s the next step?",
  paused: "Parked. I’ll stop asking about it.",
};

export const NEXT_CHECK: Line = {
  id: "jobs",
  from: "kata",
  text: "And the job hunt: Stripe wrote back on Tuesday. Is Monday’s call booked?",
  replies: [
    { label: "Booked", value: "booked" },
    { label: "Not yet", value: "later" },
    { label: "Help me prep", value: "prep" },
  ],
};

export const NEXT_REPLY: Record<string, string> = {
  booked: "Then I’ll add two prep questions to today’s page.",
  later: "I’ll bring it up again tonight.",
  prep: "Start with this: what do you want them to remember after the call?",
};

export const MOOD_ASK: Line = { id: "mood", from: "kata", text: "How’s your head today?", mood: true };

export const MOODS = [
  { value: 1, label: "Foggy" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Bright" },
];

export const MOOD_REPLY: Record<number, string> = {
  1: "Foggy days happen. Keep today small.",
  2: "Noted. One thing at a time today.",
  3: "Okay is fine. What would make it good?",
  4: "Good. Let’s use it on the hard thing.",
  5: "Bright. Spend it on the webhook.",
};

export const QUESTIONS = [
  { id: "q1", tag: "webhook", hue: 0, text: "What’s the one thing still standing between you and merging?" },
  { id: "q2", tag: "job-hunt", hue: 2, text: "What do you want them to remember after Monday’s call?" },
  { id: "q3", tag: "sleep", hue: 5, text: "What time did the screen actually go off last night?" },
];

export interface DemoPerson {
  id: string;
  name: string;
  handle: string;
  role: string;
  city: string;
  hue: number;
}

export const PEOPLE: Record<string, DemoPerson> = {
  mira: { id: "mira", name: "Mira Okafor", handle: "mira", role: "Designer", city: "Lisbon", hue: 5 },
  priya: { id: "priya", name: "Priya Nair", handle: "priya", role: "Job seeker", city: "Toronto", hue: 2 },
  kenji: { id: "kenji", name: "Kenji Mori", handle: "kenji", role: "Developer", city: "Kyoto", hue: 6 },
  arjun: { id: "arjun", name: "Arjun Rao", handle: "arjun", role: "Founder", city: "Bengaluru", hue: 7 },
  lena: { id: "lena", name: "Lena Fischer", handle: "lena", role: "Student", city: "Berlin", hue: 4 },
  theo: { id: "theo", name: "Theo Lindqvist", handle: "theo", role: "Writer", city: "Stockholm", hue: 3 },
  nani: { id: "nani", name: "Nani", handle: "nani", role: "Grandmother", city: "Hyderabad", hue: 1 },
};

export const REACTIONS: { kind: ReactionKind; label: string }[] = [
  { kind: "nice", label: "Nice" },
  { kind: "same", label: "Same" },
  { kind: "go", label: "Go on" },
  { kind: "hug", label: "Hug" },
];

export const MOMENTS: {
  id: string;
  who: string;
  kind: string;
  text: string;
  tag: string;
  when: string;
  reactions: Record<ReactionKind, number>;
}[] = [
  { id: "m1", who: "mira", kind: "Shipped", text: "The new onboarding is live. Three screens instead of nine.", tag: "design", when: "2h", reactions: { nice: 12, same: 2, go: 5, hug: 0 } },
  { id: "m2", who: "priya", kind: "Win", text: "Second interview at the place I actually want. Monday at ten.", tag: "job-hunt", when: "5h", reactions: { nice: 24, same: 1, go: 18, hug: 3 } },
  { id: "m3", who: "kenji", kind: "Thought", text: "Found the flaky test. It was the clock. It is always the clock.", tag: "shipping", when: "1d", reactions: { nice: 6, same: 9, go: 0, hug: 1 } },
];

export const WORKING_ON: { who: string; title: string; status: ThreadStatus; when: string }[] = [
  { who: "arjun", title: "Seed round", status: "moving", when: "1h" },
  { who: "lena", title: "Thesis draft", status: "stuck", when: "3h" },
  { who: "theo", title: "Chapter three", status: "moving", when: "6h" },
  { who: "nani", title: "Tomato bed", status: "moving", when: "1d" },
];
