// Demo content for the Pressed Flowers prototype. Fictional pages from a fictional
// writer's last three years: Hyderabad, a job hunt, Acme, a move to Berlin.

export type Scene = "lamp" | "pan" | "lake";

/* ── 1 · Today's page and the pressed-flower card ─────────────────────── */

export const TODAY = {
  weekday: "Thursday",
  monthDay: "29 October",
  page: 412,
  prompt: "What did I notice today?",
  draft:
    "The bakery on Weserstraße has started saying my order before I do. Small thing. It made the whole walk to the U-Bahn feel like a street I live on.",
  prompt2: "One thing for tomorrow",
  draft2: "Give Lena her drill back. Call Nani before her afternoon nap, not after.",
};

export interface Memory {
  id: string;
  /** How far back, in words. */
  ago: string;
  date: string;
  weekday: string;
  place: string;
  line: string;
  mood: string;
  scene: Scene;
  caption: string;
}

export const MEMORIES: Memory[] = [
  {
    id: "y1",
    ago: "A year ago",
    date: "29 October 2025",
    weekday: "Wednesday",
    place: "Berlin",
    line: "Second week in the flat. Bought a lamp for the kitchen because the ceiling light makes everything look like a waiting room.",
    mood: "homesick",
    scene: "lamp",
    caption: "The new lamp, still in its plastic",
  },
  {
    id: "y2",
    ago: "Two years ago",
    date: "29 October 2024",
    weekday: "Tuesday",
    place: "Hyderabad",
    line: "Nani taught me to temper mustard seeds without burning them. I burned them twice. She said that is the price.",
    mood: "full",
    scene: "pan",
    caption: "Nani’s kadai, the third try",
  },
  {
    id: "m1",
    ago: "A month ago",
    date: "29 September 2026",
    weekday: "Tuesday",
    place: "Schlachtensee",
    line: "Said no to the Friday thing and went to the lake instead. Correct decision. The water was colder than my excuses.",
    mood: "clear",
    scene: "lake",
    caption: "Schlachtensee, 7:40 am",
  },
];

/* ── 2 · The anniversary page ──────────────────────────────────────────── */

export const MILESTONE = {
  title: "Moved to Berlin",
  date: "15 October 2025",
  today: "Thursday, 15 October 2026",
  question: "What do you miss?",
  then: ["Amma’s rasam", "The rain in June", "Home"],
  /** A sample answer for the demo, so the moment plays without typing. */
  sample: "Amma’s rasam. The rain in June. Our Sunday calls, even the bad-signal ones.",
  witnessNote:
    "You stopped saying home means Hyderabad. I noticed. It’s alright, kanna. Home is allowed to move.",
};

/** Words that, if they show up in today's answer, mean an old item came back. */
export const THEN_KEYS: Record<string, string[]> = {
  "Amma’s rasam": ["rasam", "amma"],
  "The rain in June": ["rain", "monsoon", "june"],
  Home: ["home", "hyderabad"],
};

export interface Ring {
  id: string;
  label: string;
  date: string;
  /** Year ring, 0 = innermost. */
  ring: number;
  /** Position around the ring, in degrees from twelve o'clock. */
  angle: number;
}

export const RINGS_YEARS = ["2022", "2023", "2024", "2025", "2026"];

export const MILESTONES: Ring[] = [
  { id: "degree", label: "Finished the degree", date: "May 2022", ring: 0, angle: 140 },
  { id: "nani", label: "Moved in with Nani", date: "Aug 2023", ring: 1, angle: 210 },
  { id: "acme", label: "Started at Acme", date: "Mar 2024", ring: 2, angle: 70 },
  { id: "berlin", label: "Moved to Berlin", date: "Oct 2025", ring: 3, angle: 290 },
  { id: "tenk", label: "Ran the 10k I promised", date: "May 2026", ring: 4, angle: 135 },
];

export const PROPOSED: Ring = { id: "german", label: "First conversation all in German", date: "Sep 2026", ring: 4, angle: 250 };

/* ── 3 · Ask my almanac ────────────────────────────────────────────────── */

export interface CitedPage {
  id: string;
  date: string;
  weekday: string;
  prompt: string;
  text: string;
  tags: string[];
}

export const PAGES: Record<string, CitedPage> = {
  "2025-12-07": {
    id: "2025-12-07",
    date: "7 Dec 2025",
    weekday: "Sunday",
    prompt: "What did I notice today?",
    text: "Lena came over and we made rasam on the two-ring stove. The tamarind here is wrong but the smell was right. For an hour the flat felt like it had a past.",
    tags: ["home", "food"],
  },
  "2026-03-21": {
    id: "2026-03-21",
    date: "21 Mar 2026",
    weekday: "Saturday",
    prompt: "What did I notice today?",
    text: "First warm day. Sat on the canal wall with Lena until the light went. Didn’t check the time once, which is how I know.",
    tags: ["berlin"],
  },
  "2026-09-14": {
    id: "2026-09-14",
    date: "14 Sep 2026",
    weekday: "Monday",
    prompt: "What went well?",
    text: "Got lost on the way back from Tempelhof and didn’t mind. Realised I was walking home, not back.",
    tags: ["berlin", "home"],
  },
  "2024-01-19": {
    id: "2024-01-19",
    date: "19 Jan 2024",
    weekday: "Friday",
    prompt: "What did I promise myself?",
    text: "Promise: whatever job comes next, I leave my desk by seven and I keep Sundays for Nani. Writing it down so I can’t pretend I didn’t.",
    tags: ["jobhunt", "promise"],
  },
  "2024-03-04": {
    id: "2024-03-04",
    date: "4 Mar 2024",
    weekday: "Monday",
    prompt: "What went well?",
    text: "Day one at Acme. Left at 6:50. Small, but I said I would.",
    tags: ["acme", "promise"],
  },
  "2024-11-02": {
    id: "2024-11-02",
    date: "2 Nov 2024",
    weekday: "Saturday",
    prompt: "What did I notice today?",
    text: "Nani says you can hear when the dal is ready. I can’t yet. She can from the other room.",
    tags: ["food", "family"],
  },
  "2024-10-29": {
    id: "2024-10-29",
    date: "29 Oct 2024",
    weekday: "Tuesday",
    prompt: "What did I notice today?",
    text: "Nani taught me to temper mustard seeds without burning them. I burned them twice. She said that is the price.",
    tags: ["food", "family"],
  },
  "2024-02-11": {
    id: "2024-02-11",
    date: "11 Feb 2024",
    weekday: "Sunday",
    prompt: "What did I notice today?",
    text: "Two rejections before lunch. Made soup anyway. Walked to the lake and counted the herons instead of the emails.",
    tags: ["jobhunt"],
  },
  "2024-03-12": {
    id: "2024-03-12",
    date: "12 Mar 2024",
    weekday: "Tuesday",
    prompt: "What went well?",
    text: "Stopped counting applications. Started counting walks. Nine this month, two offers’ worth of calm.",
    tags: ["jobhunt"],
  },
  "2024-01-30": {
    id: "2024-01-30",
    date: "30 Jan 2024",
    weekday: "Tuesday",
    prompt: "What’s blocking me?",
    text: "Fear that the gap on my CV is the whole story. Priya said the gap is just the part where I was thinking. Keeping that.",
    tags: ["jobhunt"],
  },
};

/** One segment of an answer letter: plain text, or a citation to a page. */
export type Part = string | { cite: string; label: string };

export interface Answer {
  id: string;
  question: string;
  keys: string[];
  paragraphs: Part[][];
}

export const ANSWERS: Answer[] = [
  {
    id: "home",
    question: "When did Berlin start to feel like home?",
    keys: ["berlin", "home", "settle", "belong"],
    paragraphs: [
      [
        "Not all at once. The first sign I can find is in December, when you and Lena cooked rasam and you wrote that the flat “felt like it had a past” ",
        { cite: "2025-12-07", label: "7 Dec" },
        ".",
      ],
      [
        "In March you sat on the canal wall until the light went and didn’t check the time ",
        { cite: "2026-03-21", label: "21 Mar" },
        ". And in September you got lost near Tempelhof and noticed you were walking home, not back ",
        { cite: "2026-09-14", label: "14 Sep" },
        ".",
      ],
      ["If I had to choose a day, it would be that one. You chose the word first."],
    ],
  },
  {
    id: "promise",
    question: "What did I promise myself before Acme?",
    keys: ["promise", "acme", "job", "work", "before"],
    paragraphs: [
      [
        "Two things, written in January: leave your desk by seven, and keep Sundays for Nani ",
        { cite: "2024-01-19", label: "19 Jan" },
        ".",
      ],
      [
        "On your first day you left at 6:50 and wrote it down like a small win ",
        { cite: "2024-03-04", label: "4 Mar" },
        ". I can’t tell from your pages whether the Sundays held after you moved. You might know.",
      ],
    ],
  },
  {
    id: "nani",
    question: "What has Nani taught me in the kitchen?",
    keys: ["nani", "cook", "kitchen", "food", "taught", "rasam", "dal"],
    paragraphs: [
      [
        "To temper mustard seeds without burning them, at the price of burning them twice ",
        { cite: "2024-10-29", label: "29 Oct" },
        ".",
      ],
      [
        "And something you haven’t learned yet: to hear when the dal is ready. She can from the other room ",
        { cite: "2024-11-02", label: "2 Nov" },
        ". You took the rasam to Berlin ",
        { cite: "2025-12-07", label: "7 Dec" },
        ".",
      ],
    ],
  },
];

export const ALMANAC_SIZE = { pages: 412, letters: 61 };

/* ── 4 · Lending ───────────────────────────────────────────────────────── */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Pages written per month in the demo archive. */
export const PAGE_COUNTS: Record<string, number[]> = {
  "2024": [24, 27, 22, 19, 14, 16, 11, 9, 12, 21, 18, 15],
  "2025": [17, 13, 20, 18, 15, 12, 6, 10, 22, 26, 24, 21],
  "2026": [19, 16, 23, 20, 18, 17, 14, 15, 21, 25, 0, 0],
};

/** Months the writer marked tender: never resurfaced, never lent. */
export const TENDER: Record<string, number[]> = { "2025": [6, 7] };

export const LEND_TAGS = ["jobhunt", "acme", "berlin", "home", "food", "family", "running"];

export interface Lending {
  months: string[]; // "2024-0" = Jan 2024
  tags: string[];
}

export const INITIAL_LENDING: Record<string, Lending> = {
  priya: { months: ["2024-0", "2024-1", "2024-2", "2024-3"], tags: ["jobhunt"] },
  nani: { months: ["2025-9", "2025-10", "2025-11"], tags: ["food", "home"] },
  lena: { months: [], tags: [] },
  arjun: { months: [], tags: [] },
  mira: { months: [], tags: [] },
};

export const LEND_PEOPLE = ["priya", "nani", "lena", "arjun", "mira"];

export interface Ask {
  id: string;
  from: string;
  asked: string;
  question: string;
  draft: string;
  cites: string[];
  span: string;
  declineNote: string;
}

export const ASKS: Ask[] = [
  {
    id: "priya-jobhunt",
    from: "priya",
    asked: "Today, 8:14 am",
    question: "How did you keep going in the job hunt? I’m in month three and it’s getting heavy.",
    draft:
      "Around month three I stopped counting applications and started counting walks. Two rejections before lunch once, and I made soup anyway. The thing that helped most was something you said: the gap is just the part where I was thinking. I kept that. You can keep it too.",
    cites: ["2024-03-12", "2024-02-11", "2024-01-30"],
    span: "January to April 2024 · #jobhunt",
    declineNote: "would rather tell you this one in person.",
  },
  {
    id: "nani-winter",
    from: "nani",
    asked: "Yesterday, 9:02 pm",
    question: "Were you eating properly that first winter? Tell me the truth.",
    draft:
      "Mostly. Rasam on Sundays, the way you showed me, though the tamarind here is wrong. Lena came over in December and the flat smelled right for the first time. Some weeks it was bread and cheese. Now you know.",
    cites: ["2025-12-07"],
    span: "October to December 2025 · #food #home",
    declineNote: "would rather tell you this one on Sunday’s call.",
  },
];
