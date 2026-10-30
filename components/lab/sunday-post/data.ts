// Demo content for The Sunday Post prototype. Fictional, shared cast only.

export type Motif = "tram" | "flower" | "pine" | "sun" | "pot";

export const SUNDAY = "Sunday 1 November";
export const SUNDAY_SHORT = "1 Nov";
export const NEXT_SUNDAY = "Sunday 8 November";
export const SUNDAY_AFTER = "Sunday 15 November";
export const WEEK_RANGE = "26 October – 1 November";

/** Where the demo writer posts from. */
export const ME_CITY = "Hyderabad";

const CONTINENT: Record<string, string> = {
  Hyderabad: "Asia",
  Bengaluru: "Asia",
  Kyoto: "Asia",
  Lisbon: "Europe",
  Porto: "Europe",
  Berlin: "Europe",
  Stockholm: "Europe",
  Toronto: "North America",
};

/** Letters to another continent spend one more Sunday in transit. */
export function crossesContinent(city: string) {
  return CONTINENT[city] !== CONTINENT[ME_CITY];
}

// ── Kata's own letter (also the source for slips) ────────────────────────────

export interface Sentence {
  id: string;
  text: string;
  /** Phrases Kata hides before a slip leaves: names, places, anything medical. */
  hide?: string[];
}

export const KATA_LETTER: Sentence[][] = [
  [
    { id: "a1", text: "You wrote six pages this week, and four of them happened in the kitchen." },
    {
      id: "a2",
      text: "On Tuesday you cooked Nani’s dal in a pan far too small for it, and did it anyway, stirring with the wrong spoon until the whole flat smelled like her house.",
      hide: ["Nani’s"],
    },
    { id: "a3", text: "On Wednesday you wrote that you were tired of being good at waiting." },
  ],
  [
    { id: "b1", text: "Thursday turned something." },
    {
      id: "b2",
      text: "After the appointment with Dr. Menon you walked home the long way, round the lake, and wrote one line: “Nothing is fixed, but I’m less afraid of it.”",
      hide: ["the appointment with Dr. Menon"],
    },
    { id: "b3", text: "It’s the truest thing in the week, and you wrote it in nine words." },
  ],
  [
    { id: "c1", text: "If the week needs a word, I’d choose unhurried." },
    { id: "c2", text: "You said you’d call Nani before next Sunday. I’ll ask how it went.", hide: ["Nani"] },
  ],
];

export const ALL_SENTENCES = KATA_LETTER.flat();

// ── Your postcard ────────────────────────────────────────────────────────────

export interface PostcardLine {
  id: string;
  day: string;
  text: string;
  /** Why Kata left this one struck out by default. */
  sensitive?: string;
}

export const MY_LINES: PostcardLine[] = [
  { id: "l1", day: "Tuesday", text: "Cooked Nani’s dal in a pan far too small for it. Did it anyway." },
  { id: "l2", day: "Thursday", text: "Walked home the long way, round the lake. Nothing is fixed, but I’m less afraid of it." },
  {
    id: "l3",
    day: "Thursday",
    text: "Second appointment with Dr. Menon. Results next week.",
    sensitive: "It mentions a doctor, so Kata left it out. Tap it to put it back.",
  },
  { id: "l4", day: "Friday", text: "Fixed the bike chain myself. Black hands for a day, worth it." },
  { id: "l5", day: "Saturday", text: "Read on the balcony until the light went. Two chapters, no phone." },
];

export const WORD_CHOICES = ["Unhurried", "Kitchen", "Less afraid"];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
/** Mood, 1 (low) to 5 (bright), one per day. */
export const MY_MOOD = [3, 2, 2, 4, 4, 3, 5];

/** People you approved to receive your postcard. */
export const FOLLOWERS = ["arjun", "lena", "nani", "theo"];
/** Someone waiting for your approval. */
export const FOLLOW_REQUEST = "priya";

// ── This Sunday's post ───────────────────────────────────────────────────────

export interface Post {
  id: string;
  from: string;
  kind: "letter" | "postcard";
  city: string;
  postmarked: string;
  motif: Motif;
  rotate: number;
  /** Postcard parts. */
  word?: string;
  lines?: string[];
  mood?: number[];
  /** Letter parts; the first paragraph is the salutation. */
  body?: (first: string) => string[];
  signoff?: string;
  /** Shown under the letter: how long it travelled, the shoebox. */
  trail?: string[];
  shoebox?: string;
  /** How long since they last wrote, said on the envelope. */
  since?: string;
}

export const POST: Post[] = [
  {
    id: "nani",
    from: "nani",
    kind: "postcard",
    city: "Hyderabad",
    postmarked: "1 Nov",
    motif: "flower",
    rotate: -7,
    word: "Marigolds",
    lines: [
      "The marigolds came up on the balcony. All orange, not one yellow.",
      "Your uncle fixed the radio. It gets one station now. Good station.",
      "Made dal on Tuesday also. Mine was in the correct pan.",
    ],
    mood: [4, 4, 3, 4, 5, 4, 4],
  },
  {
    id: "arjun",
    from: "arjun",
    kind: "postcard",
    city: "Bengaluru",
    postmarked: "1 Nov",
    motif: "sun",
    rotate: -2.5,
    word: "Shipped",
    lines: [
      "Pushed the release at 1 a.m. and couldn’t sleep from relief.",
      "Ate dosa standing at the counter, twice.",
      "Gave the team Friday off. Took it off myself, mostly.",
    ],
    mood: [2, 2, 3, 2, 5, 4, 4],
  },
  {
    id: "theo",
    from: "theo",
    kind: "postcard",
    city: "Stockholm",
    postmarked: "1 Nov",
    motif: "pine",
    rotate: 2.5,
    word: "Dark at four",
    lines: [
      "Wrote 900 words of the new chapter and kept 300.",
      "First frost on the bike seat.",
      "Lit the candles at four because it was already night.",
    ],
    mood: [3, 3, 2, 3, 3, 4, 3],
  },
  {
    id: "mira",
    from: "mira",
    kind: "letter",
    city: "Lisbon",
    postmarked: "25 Oct",
    motif: "tram",
    rotate: 6.5,
    body: (first) => [
      `Dear ${first},`,
      "Someone in the old studio chat posted a slip of yours on Tuesday. The one about cooking your grandmother’s dal in a pan far too small for it, and doing it anyway. I read it on the 28 tram and laughed so suddenly that a man moved seats.",
      "It’s been a year. That’s on me as much as you. I kept waiting to have something worth sending, and so I sent nothing.",
      "So here is something not worth much: Lisbon is finally cool in the evenings. I’ve started drawing the tram stops. I’m bad at it and I’m doing it anyway, which I think I learned from your slip.",
      "Write back on a Sunday. I’ll be here.",
    ],
    signoff: "Mira",
    trail: ["Posted in Lisbon, Sunday 25 October", "One extra Sunday in transit", `Arrived in ${ME_CITY}, ${SUNDAY}`],
    shoebox: "Mira’s shoebox: 4 letters since 2023. The last one came 14 October 2025.",
    since: "first in a year",
  },
];

/** A first letter from someone new waits in its own tray. */
export const NEW_SENDER = {
  from: "ana",
  city: "Porto",
  note: "Dina says Mira passed your slip on to her.",
  body: "I teach eleven-year-olds and none of them can cook either. I read them your slip and two of them made rice for their families on Saturday. Thank you for the wrong spoon.",
};

// ── Slow mail ────────────────────────────────────────────────────────────────

export const RECIPIENTS = ["mira", "nani", "arjun", "kenji", "theo", "priya"];

/** Lines from your own pages that can be quoted into a letter. */
export const MY_PAGES = [
  { id: "q1", date: "Tue 27 Oct", text: "Cooked Nani’s dal in a pan far too small for it. Did it anyway." },
  { id: "q2", date: "Thu 29 Oct", text: "Nothing is fixed, but I’m less afraid of it." },
  { id: "q3", date: "Sat 24 Oct", text: "Read on the balcony until the light went. Two chapters, no phone." },
  { id: "q4", date: "Mon 12 Oct", text: "Found the old studio photos. Mira’s terrible fringe. My worse one." },
  { id: "q5", date: "Sun 4 Oct", text: "Lisbon still feels like the city where I was most myself." },
];

/** Stamps are earned one per written day. */
export const STAMPS = 6;

export const SEEDED_OUTGOING = {
  id: "out-nani",
  to: "nani",
  body: "Nani, the pan was too small and the spoon was wrong and it still tasted like your kitchen. I’ll call before Sunday. Tell the marigolds I said hello.",
};
