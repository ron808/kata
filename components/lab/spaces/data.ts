import { CAST } from "@/components/lab/cast";
import type { ReactionKind, ThreadKind, ThreadStatus } from "@/lib/types";

/*
 * The spaces prototypes' made-up world: the writer, the Lab's shared cast as people they follow,
 * their threads and two spaces with a few days in them. Times are minutes before "now", so the
 * server and the browser draw the same thing. Nothing here is real or saved.
 */

/** The signed-in writer. Everyone else is someone from the Lab's cast. */
export const ME = "me";

export interface Who {
  id: string;
  name: string;
  first: string;
  hue: number;
}

export interface Friend extends Who {
  city: string;
  /** Follows you back. Only people who follow each other can share anything. */
  mutual: boolean;
}

// Each person's own colour, as on their profile.
const HUE: Record<string, number> = { mira: 5, arjun: 7, lena: 3, theo: 4, priya: 2, kenji: 6, ana: 0, nani: 1 };

/** Everyone you follow. Theo hasn't followed you back, so Theo can't be added to anything yet. */
export const FRIENDS: Friend[] = CAST.map((p) => ({ id: p.id, name: p.name, first: p.first, city: p.city, hue: HUE[p.id] ?? 2, mutual: p.id !== "theo" }));

export function whoOf(id: string, me: Who): Who {
  if (id === ME) return me;
  return FRIENDS.find((f) => f.id === id) ?? { id, name: id, first: id, hue: 2 };
}

export interface DemoThread {
  id: string;
  owner: string;
  title: string;
  kind: ThreadKind;
  hue: number;
  status: ThreadStatus;
  /** A few words under the name: a date, a rhythm, what it's waiting on. */
  meta: string;
  /** A habit: days it's been kept, and whether today's done. */
  streak: number;
  doneToday: boolean;
  /** What the owner noted on it before anyone else could see it. They stay the owner's. */
  notes: string[];
}

const thread = (t: Partial<DemoThread> & Pick<DemoThread, "id" | "owner" | "title" | "kind" | "hue">): DemoThread => ({
  status: "moving",
  meta: "",
  streak: 0,
  doneToday: false,
  notes: [],
  ...t,
});

/** Your threads, private until you put one somewhere. */
export const MY_THREADS: DemoThread[] = [
  thread({
    id: "lisbon",
    owner: ME,
    title: "Lisbon trip",
    kind: "event",
    hue: 2,
    meta: "14 to 21 March",
    notes: ["Ask Mira if March works", "Budget: about 600 for the week", "Check the visa covers Portugal", "Book the Tuesday off", "Look up the 28 tram", "Pack the good camera"],
  }),
  thread({ id: "visa", owner: ME, title: "Visa paperwork", kind: "task", hue: 6, status: "waiting", meta: "Forms sent on the 3rd", notes: ["Forms sent on the 3rd", "Photos done", "They said four weeks"] }),
  thread({ id: "portuguese", owner: ME, title: "Portuguese lessons", kind: "learning", hue: 5, meta: "Tuesdays and Thursdays", notes: ["Lesson 12: the past tense", "Practise numbers"] }),
  thread({ id: "run", owner: ME, title: "Run 3x a week", kind: "habit", hue: 3, streak: 2, notes: ["Shin hurt after the long one", "New shoes on Friday", "5 km in 31 minutes"] }),
  thread({ id: "portfolio", owner: ME, title: "Portfolio site", kind: "project", hue: 0, status: "stuck", meta: "Three case studies", notes: ["Can’t pick the case studies", "Ask someone for a read"] }),
  thread({ id: "sleep", owner: ME, title: "Sleep before midnight", kind: "habit", hue: 4, streak: 5, notes: ["Phone out of the bedroom"] }),
];

/** Threads your friends keep, in the spaces you share with them. */
const THEIR_THREADS: DemoThread[] = [
  thread({ id: "stay", owner: "mira", title: "Where we stay", kind: "task", hue: 1, meta: "A flat in Graça" }),
  thread({ id: "flights", owner: "arjun", title: "Flights for four", kind: "task", hue: 7, status: "waiting", meta: "TAP or easyJet" }),
  thread({ id: "sintra", owner: "lena", title: "Day trip to Sintra", kind: "event", hue: 0, meta: "Wednesday 17 March" }),
  thread({ id: "c25k", owner: "priya", title: "Couch to 5k", kind: "habit", hue: 5, meta: "Week 5 of 9", streak: 4 }),
  thread({ id: "half", owner: "kenji", title: "Half marathon in May", kind: "goal", hue: 2, meta: "Training week 3" }),
];

/** One thread of each friend's that they might put in a new space, with its first update. */
export const THEIR_OWN: Record<string, { thread: DemoThread; line: string }> = {
  mira: { thread: thread({ id: "g-mira", owner: "mira", title: "Learning to surf", kind: "learning", hue: 2, meta: "Saturdays at Carcavelos" }), line: "Stood up on the board twice today." },
  arjun: { thread: thread({ id: "g-arjun", owner: "arjun", title: "Launch the app", kind: "project", hue: 0, meta: "Beta in December" }), line: "Sent the build to 20 testers." },
  lena: { thread: thread({ id: "g-lena", owner: "lena", title: "Thesis draft", kind: "project", hue: 4, meta: "Due in January" }), line: "Chapter two is with my supervisor." },
  priya: { thread: thread({ id: "g-priya", owner: "priya", title: "Job hunt", kind: "goal", hue: 7, meta: "Three interviews going" }), line: "Second interview on Thursday." },
  kenji: { thread: thread({ id: "g-kenji", owner: "kenji", title: "Pottery class", kind: "learning", hue: 6, meta: "Thursday evenings" }), line: "Made a bowl that holds water." },
  ana: { thread: thread({ id: "g-ana", owner: "ana", title: "Vegetable garden", kind: "project", hue: 3, meta: "Winter beds" }), line: "The tomatoes made it through the frost." },
  nani: { thread: thread({ id: "g-nani", owner: "nani", title: "Family recipes", kind: "project", hue: 1, meta: "Twelve written down" }), line: "Wrote down the lime pickle at last." },
  theo: { thread: thread({ id: "g-theo", owner: "theo", title: "Short story", kind: "project", hue: 5, meta: "Second draft" }), line: "Cut 2,000 words and it’s better." },
};

export const ALL_THREADS: DemoThread[] = [...MY_THREADS, ...THEIR_THREADS, ...Object.values(THEIR_OWN).map((g) => g.thread)];

export type Cheers = Partial<Record<ReactionKind, string[]>>;

/** Something done in a space that the people in it can see. */
export type Item =
  | { id: string; space: string; kind: "update"; by: string; thread: string; text: string; status: ThreadStatus | null; ago: number; cheers: Cheers }
  | { id: string; space: string; kind: "say"; by: string; text: string; ago: number }
  | { id: string; space: string; kind: "note"; by: string; what: "made" | "added" | "out" | "removed" | "invited" | "left"; thread?: string; person?: string; ago: number };

export interface Space {
  id: string;
  name: string;
  hue: number;
  /** Who made it: the one who adds and removes people. */
  maker: string;
  members: string[];
  /** Threads in it, the one with the newest news first. */
  threads: string[];
  /** The same threads in the order they were put in: how the room pins them. */
  pins: string[];
}

export const SPACES: Space[] = [
  { id: "trip", name: "Lisbon in March", hue: 6, maker: ME, members: [ME, "mira", "arjun", "lena"], threads: ["sintra", "flights", "stay", "lisbon"], pins: ["lisbon", "stay", "flights", "sintra"] },
  { id: "runners", name: "Sunday runners", hue: 3, maker: "priya", members: ["priya", ME, "kenji"], threads: ["c25k", "half", "run"], pins: ["c25k", "half", "run"] },
];

const H = 60;
const D = 24 * H;

/** A few days in each space, oldest first. The board shows each thread's latest update; the room shows the lot. */
export const ITEMS: Item[] = [
  { id: "i1", space: "trip", kind: "note", by: ME, what: "made", ago: 4 * D },
  { id: "i2", space: "trip", kind: "say", by: "mira", text: "Okay, this is happening. I’ll find us somewhere to stay.", ago: 3 * D + 5 * H },
  { id: "i3", space: "trip", kind: "update", by: ME, thread: "lisbon", text: "Picked the week: 14 to 21 March.", status: null, ago: 3 * D + 4 * H, cheers: { go: ["mira"], nice: ["arjun", "lena"] } },
  { id: "i4", space: "trip", kind: "update", by: "mira", thread: "stay", text: "Found a flat in Graça with room for four. Asking about March.", status: null, ago: 2 * D + 2 * H, cheers: { nice: ["lena"] } },
  { id: "i5", space: "trip", kind: "say", by: "lena", text: "That view though.", ago: 2 * D + H },
  { id: "i6", space: "trip", kind: "update", by: "arjun", thread: "flights", text: "Waiting on Lena’s dates before I book.", status: "waiting", ago: D + 3 * H, cheers: {} },
  { id: "i7", space: "trip", kind: "say", by: "lena", text: "Sorry. Confirming with work tomorrow.", ago: D + 2 * H },
  { id: "i8", space: "trip", kind: "update", by: "lena", thread: "sintra", text: "Sintra on the Wednesday? Pena Palace opens at 9.", status: null, ago: 5 * H, cheers: { go: ["mira"] } },

  { id: "r1", space: "runners", kind: "note", by: "priya", what: "made", ago: 9 * D },
  { id: "r2", space: "runners", kind: "update", by: ME, thread: "run", text: "Two this week so far. Legs know it.", status: null, ago: 3 * D, cheers: { go: ["priya", "kenji"] } },
  { id: "r3", space: "runners", kind: "update", by: "kenji", thread: "half", text: "14 km on Sunday. Knees fine.", status: null, ago: 2 * D, cheers: { nice: ["priya"] } },
  { id: "r4", space: "runners", kind: "say", by: "kenji", text: "Long run this Sunday, anyone?", ago: 2 * D - 2 * H },
  { id: "r5", space: "runners", kind: "update", by: "priya", thread: "c25k", text: "Week 5, run 1. Didn’t stop once.", status: null, ago: D + 4 * H, cheers: { go: ["kenji"] } },
];

/** What the others do next, one tap at a time, for trying it. */
export type Incoming =
  | { by: string; kind: "update"; thread: string; text: string; status?: ThreadStatus }
  | { by: string; kind: "say"; text: string }
  | { by: string; kind: "add"; thread: string; text: string };

export const SCRIPTS: Record<string, Incoming[]> = {
  trip: [
    { by: "arjun", kind: "update", thread: "flights", text: "Booked. TAP, 14 to 21 March, all four of us.", status: "done" },
    { by: "mira", kind: "say", text: "Yes. I’ll tell the flat in Graça we’re sure." },
    { by: "lena", kind: "update", thread: "sintra", text: "Found a walking route from the station, about three hours." },
    { by: "mira", kind: "update", thread: "stay", text: "The flat said yes: six nights, four beds.", status: "done" },
    { by: "arjun", kind: "say", text: "Who’s bringing a speaker?" },
  ],
  runners: [
    { by: "kenji", kind: "update", thread: "half", text: "16 km this morning. Slow, but done." },
    { by: "priya", kind: "update", thread: "c25k", text: "Week 5, run 2. Still didn’t stop.", status: "done" },
    { by: "priya", kind: "say", text: "Long run on Sunday? I can do 8 km." },
  ],
};

/** A new space's first news: each person you picked puts one of their own threads in. */
export function scriptFor(members: string[]): Incoming[] {
  const adds: Incoming[] = members.filter((m) => THEIR_OWN[m]).map((m) => ({ by: m, kind: "add", thread: THEIR_OWN[m].thread.id, text: THEIR_OWN[m].line }));
  return members.length ? [...adds, { by: members[0], kind: "say", text: "Easier than the group chat." }] : adds;
}

/* ── Words ─────────────────────────────────────────────────────────────── */

/** "Mira", "Mira and Arjun", "Mira, Arjun and Lena". */
export function listOf(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

const NUMBER = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const inWords = (n: number) => NUMBER[n] ?? String(n);

/** "sees" for one person, "see" for more: "Mira sees", "Mira and Arjun see". */
export const verb = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** "1 thread", "3 threads". */
export const count = (n: number, one: string, many = `${one}s`) => `${n === 1 ? "one" : inWords(n)} ${n === 1 ? one : many}`;

/** When something happened, from how many minutes ago. */
export function agoLabel(min: number): string {
  if (min < 1) return "Just now";
  if (min < H) return `${min} min ago`;
  if (min < D) return `${Math.round(min / H)}h ago`;
  if (min < 2 * D) return "Yesterday";
  return `${Math.floor(min / D)} days ago`;
}

/** The day something happened, for the room's day lines. */
export function dayLabel(min: number): string {
  if (min < D) return "Today";
  if (min < 2 * D) return "Yesterday";
  return `${Math.floor(min / D)} days ago`;
}

/** A thread's few words, with where a habit is today. */
export function metaOf(t: DemoThread): string {
  if (t.kind !== "habit") return t.meta;
  const today = t.status === "paused" ? "Paused" : t.doneToday ? "Done today" : "Not yet today";
  return t.meta ? `${t.meta} · ${today}` : today;
}

/** A step set on a thread: a habit's Done counts today, Going takes it back. */
export function withStep(t: DemoThread, step: ThreadStatus): DemoThread {
  if (t.kind !== "habit") return { ...t, status: step };
  if (step === "done") return t.doneToday ? t : { ...t, status: "moving", doneToday: true, streak: t.streak + 1 };
  if (step === "moving") return { ...t, status: "moving", doneToday: false, streak: t.doneToday ? Math.max(0, t.streak - 1) : t.streak };
  return { ...t, status: step };
}
