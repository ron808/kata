// Demo content for the Kasane prototype. Fictional people and days; nothing here is real.
// "Today" in the demo is Thursday, Oct 29, 2026.

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Screen 1: a private page, one passage passed on ─────────────────────── */

export interface Passage {
  id: string;
  text: string;
  /** People named in this passage, suggested first in the picker. */
  named: string[];
}

export const PAGE = {
  weekday: "Sunday",
  monthDay: "October 25",
  number: 212,
  prompt: "What do you want to remember?",
  passages: [
    {
      id: "p1",
      text: "Last full day in Lisbon. Slept until the church bells, then walked to the Feira da Ladra and bought a blue tile I have nowhere to put.",
      named: [],
    },
    {
      id: "p2",
      text: "Arjun and Kenji got in from the conference at four, still wearing their lanyards, so we took the ferry to Cacilhas for grilled fish.",
      named: ["arjun", "kenji"],
    },
    {
      id: "p3",
      text: "Coming back, the ferry stopped dead in the middle of the river. Forty minutes in the dark with the whole city lit up on one side, Kenji peeling his emergency oranges and Arjun narrating it like a nature documentary.",
      named: ["arjun", "kenji"],
    },
    {
      id: "p4",
      text: "Nobody checked their phone. I keep thinking about that.",
      named: [],
    },
  ] satisfies Passage[],
  todoPrompt: "Before I fly",
  todos: [
    { id: "t1", text: "Wrap the tile in two pairs of socks", done: false },
    { id: "t2", text: "Send Mira the river photos", done: true },
    { id: "t3", text: "Ask Kenji where the oranges came from", done: false },
  ],
  energy: 4,
  tags: ["lisbon", "friends"],
};

export const PASS_DEFAULT = { selected: ["p3"], people: ["arjun", "kenji"] };
export const PASS_TITLE = "The ferry that stopped";

/* ── Screen 2: Mira passed a night to you ────────────────────────────────── */

export const INVITE = {
  from: "mira",
  day: "Saturday, Oct 24",
  dayShort: "Saturday",
  place: "Alfama, Lisbon",
  title: "The night the lights went out",
  note: "You were there. Tell me what you remember?",
  passedOn: "Monday evening",
  unfoldsAt: "tonight at 9",
  prompts: [
    { id: "remember", label: "What do you remember?" },
    { id: "unseen", label: "Something nobody else saw" },
  ],
};

/** The side you start with: a draft you can change. You thought the night went badly. */
export const MY_SIDE_DRAFT =
  "I’d booked the little place on Rua dos Remédios for her birthday weeks ago, and at half eight the whole of Alfama went dark. The kitchen closed. We ended up on the steps outside her building with bread, a tin of sardines and a candle the neighbour lent us. I kept apologising. Honestly, I think I ruined it. She was quiet on the walk home and I didn’t know what to say.";

export const MY_UNSEEN_DRAFT = "";

/** Mira’s side, written blind. It stays sealed until you’ve written yours. */
export const MIRA_SIDE = [
  "Best night of my month. Maybe of the year.",
  "The lights went out and the whole street came outside like it was a festival. Senhor Abílio played guitar from his window by the light of somebody’s phone. We ate sardines off the lid of the tin and I laughed until I cried.",
  "I was quiet walking home because I didn’t want it to end. I’ve been tired since the summer. On Saturday I wasn’t.",
];

export const MIRA_KEPT = "Mira kept one answer for herself.";

export const PREFACE = [
  "You both kept the sardines on the steps, and how quiet the walk home was.",
  "You remember the dinner that didn’t happen. Mira remembers the street coming outside.",
];

/** Where the two layers say the same thing. Kata marks these once the layers settle. */
export const MEETS = {
  mine: ["a tin of sardines", "quiet on the walk home"],
  theirs: ["sardines off the lid of the tin", "quiet walking home"],
};

/* ── Screen 3, second Kasane: four pens, one day ─────────────────────────── */

export const KYOTO = {
  day: "Thursday, Sep 17",
  place: "Arashiyama, Kyoto",
  title: "Day three",
  unfolded: "unfolded on Sep 20",
  preface: [
    "Four pens, one day. Three of you wrote about the station.",
    "Only one of you wrote about the bamboo.",
  ],
  sides: [
    {
      who: "theo",
      when: "Wrote it that night",
      text: "We missed the 9:12 to Arashiyama by under a minute, and I said so more than once. The next train was forty minutes away. Then the sun came out on the platform.",
    },
    {
      who: "lena",
      when: "Wrote it on the train back",
      text: "The vending machine at Saga station sells hot corn soup in a can. A can! I had two. The corn sinks to the bottom and you have to tap it out. Kenji showed me how.",
    },
    {
      who: "kenji",
      when: "Wrote it two days later",
      text: "Best day of the whole trip. Nothing went to plan and nobody minded. Theo forgave the train by lunch.",
    },
    {
      who: "me",
      when: "Last of the four, Sep 20",
      text: "I wrote down 9:12 and then forgot to write anything else until the bamboo. The bamboo was loud. Nobody tells you that.",
    },
  ],
};

/* ── Screen 4: your people, by what you remember together ────────────────── */

export interface Shared {
  id: string;
  /** ISO date of the day remembered. */
  date: string;
  label: string;
  title: string;
  pens: number;
  mine: string;
  theirs: string;
  note?: string;
}

export interface Friend {
  id: string;
  since: string;
  kasane: Shared[];
}

export const FRIENDS: Friend[] = [
  {
    id: "mira",
    since: "March 2024",
    kasane: [
      {
        id: "m1",
        date: "2024-03-09",
        label: "Mar 9, 2024",
        title: "The flat with no hot water",
        pens: 2,
        mine: "We boiled pasta water for her bath. It took six pans.",
        theirs: "My first night in Lisbon and someone carried pans up four floors for me.",
      },
      {
        id: "m2",
        date: "2025-06-12",
        label: "Jun 12, 2025",
        title: "Santo António, sardines on the stairs",
        pens: 2,
        mine: "Too loud to talk. We just pointed at things.",
        theirs: "Someone’s grandmother gave us basil in a pot and refused money.",
      },
      {
        id: "m3",
        date: "2025-11-01",
        label: "Nov 1, 2025",
        title: "The Sintra train that went to Cascais",
        pens: 2,
        mine: "Wrong platform. My fault entirely.",
        theirs: "We ended up swimming in November. I’d do it again.",
        note: "A year old on Sunday. Kata will bring it back that morning.",
      },
      {
        id: "m4",
        date: "2026-02-14",
        label: "Feb 14, 2026",
        title: "The ceramics class",
        pens: 2,
        mine: "My bowl is a plate now. It decided.",
        theirs: "I still drink coffee from the lopsided cup.",
      },
      {
        id: "m5",
        date: "2026-10-24",
        label: "Oct 24, 2026",
        title: "The night the lights went out",
        pens: 2,
        mine: "I thought I’d ruined her birthday.",
        theirs: "Best night of my month. Maybe of the year.",
      },
    ],
  },
  {
    id: "nani",
    since: "December 2024",
    kasane: [
      {
        id: "n1",
        date: "2024-12-25",
        label: "Dec 25, 2024",
        title: "Pesarattu, lesson one",
        pens: 2,
        mine: "Mine tore. Hers didn’t. She says the pan remembers.",
        theirs: "The child is patient now. That is new.",
      },
      {
        id: "n2",
        date: "2025-08-10",
        label: "Aug 10, 2025",
        title: "The mango pickle",
        pens: 2,
        mine: "Forty mangoes, one knife, three hours.",
        theirs: "Same recipe as my mother. Less salt, don’t tell anyone.",
      },
      {
        id: "n3",
        date: "2026-01-14",
        label: "Jan 14, 2026",
        title: "Sankranti kites from the terrace",
        pens: 2,
        mine: "Lost two kites to the neighbour’s boy.",
        theirs: "I watched from my chair. Best seat on the roof.",
      },
    ],
  },
  {
    id: "kenji",
    since: "April 2025",
    kasane: [
      {
        id: "k1",
        date: "2025-04-05",
        label: "Apr 5, 2025",
        title: "Hanami in the rain",
        pens: 2,
        mine: "We stayed under one umbrella for two hours.",
        theirs: "Rain is better for blossoms. Fewer people.",
      },
      {
        id: "k2",
        date: "2026-09-17",
        label: "Sep 17, 2026",
        title: "Kyoto, day three",
        pens: 4,
        mine: "The bamboo was loud. Nobody tells you that.",
        theirs: "Best day of the whole trip.",
      },
    ],
  },
  {
    id: "arjun",
    since: "August 2024",
    kasane: [
      {
        id: "a1",
        date: "2024-08-15",
        label: "Aug 15, 2024",
        title: "Launch night on the office roof",
        pens: 2,
        mine: "The site went down at 11 and nobody panicked.",
        theirs: "I panicked. I just did it quietly.",
      },
      {
        id: "a2",
        date: "2025-12-31",
        label: "Dec 31, 2025",
        title: "New Year at the highway dhaba",
        pens: 2,
        mine: "Midnight happened somewhere between the second and third chai.",
        theirs: "Best dal of my life, and I’ve eaten a lot of dal.",
      },
    ],
  },
  {
    id: "lena",
    since: "September 2026",
    kasane: [
      {
        id: "l1",
        date: "2026-09-17",
        label: "Sep 17, 2026",
        title: "Kyoto, day three",
        pens: 4,
        mine: "I wrote down 9:12 and nothing else until the bamboo.",
        theirs: "Hot corn soup in a can. A can!",
      },
    ],
  },
  {
    id: "theo",
    since: "September 2026",
    kasane: [
      {
        id: "th1",
        date: "2026-09-17",
        label: "Sep 17, 2026",
        title: "Kyoto, day three",
        pens: 4,
        mine: "The bamboo was loud.",
        theirs: "We missed the 9:12 by under a minute.",
      },
    ],
  },
];

/** Connected, but no shared memory yet. They aren’t ranked or counted. */
export const NOT_YET = ["priya", "ana"];

export const YEAR_LATE = {
  friend: "mira",
  day: "Sunday, Nov 2, 2025",
  line: "A year ago this Sunday you and Mira both wrote a page. Offer to swap them? You’ll each cover what you’d rather keep first.",
};

export const TIMELINE = { from: "2024-01-01", to: "2026-12-31", years: [2024, 2025, 2026] };
