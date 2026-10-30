// Demo content for the "Leaves & the Shelf" prototype. Fictional writers and pages only.
import { person } from "@/components/lab/cast";

export interface Leaf {
  id: string;
  /** e.g. "Tue 20 Oct" */
  date: string;
  title: string;
  body: string;
  /** Shown on a reader's view when this leaf arrived since they last opened the book. */
  fresh?: boolean;
}

export type SpineTone = "paper" | "raised" | "night" | "ink";

export interface Book {
  id: string;
  /** The person's seal initial. */
  initial: string;
  /** Pen name the author publishes under. */
  pen: string;
  title: string;
  /** One line from their colophon. */
  note: string;
  form: string;
  tone: SpineTone;
  /** Spine height as a fraction of the tallest (0.72–1). */
  height: number;
  /** Width class: 0 thin, 1 mid, 2 thick. */
  width: 0 | 1 | 2;
  /** Written a leaf recently, or resting. */
  lastLeaf: string;
  resting?: boolean;
  leaves: Leaf[];
}

const c = (id: string) => person(id);

/** Mira is not on the shelf at the start: Kata introduces her in the Sunday Edition. */
export const MIRA: Book = {
  id: "mira",
  initial: c("mira").initial,
  pen: "Mira, in Lisbon",
  title: "Small Brave Things",
  note: "A designer keeping a list of things she’ll do when she’s braver, and doing them.",
  form: "The brave list",
  tone: "night",
  height: 0.94,
  width: 2,
  lastLeaf: "Thursday",
  leaves: [
    {
      id: "mira-1",
      date: "Thu 22 Oct",
      title: "Four minutes",
      body:
        "I keep a list called ‘when I’m braver’. Tonight I did the first thing on it: I told the studio I want to lead the next project. It took four minutes. I had been carrying it for a year.",
      fresh: true,
    },
    {
      id: "mira-2",
      date: "Sun 11 Oct",
      title: "The list, as it stands",
      body:
        "Ask to lead. Swim in the sea in November. Show someone the drawings I don’t show anyone. Call my sister first, for once. Write the list down where I can see it.",
    },
    {
      id: "mira-3",
      date: "Mon 28 Sep",
      title: "Why braver, not better",
      body:
        "Better is a list that never ends. Braver has an edge to it: you either did the thing or you didn’t. I like knowing which.",
    },
  ],
};

export const BOOKS: Book[] = [
  {
    id: "arjun",
    initial: c("arjun").initial,
    pen: "Arjun R.",
    title: "Building Lantern, Vol. I",
    note: "A founder writing one honest page a day while building a small app for night-shift nurses.",
    form: "Founder’s daily",
    tone: "night",
    height: 1,
    width: 2,
    lastLeaf: "yesterday",
    leaves: [
      { id: "ar-1", date: "Wed 28 Oct", title: "We raised the price", body: "Doubled it. Two people left, nobody complained, and one nurse wrote to say it finally felt like a real tool. I’d been pricing for my own nerves, not for them.", fresh: true },
      { id: "ar-2", date: "Fri 9 Oct", title: "Chapter 3: the quiet week", body: "No launches, no fires. I fixed the login screen and called six users. It was the most useful week of the month and the least exciting one to write down." },
      { id: "ar-3", date: "Mon 21 Sep", title: "Chapter 2: the first ten", body: "The first ten paying users all came from one hospital corridor. I’m going to stop pretending that was strategy." },
    ],
  },
  {
    id: "h1", initial: "H", pen: "the ferry regular", title: "Ferry Mornings", note: "Twenty-two minutes across the water, every weekday.", form: "Three lines", tone: "paper", height: 0.82, width: 1, lastLeaf: "Monday",
    leaves: [
      { id: "h1-1", date: "Mon 19 Oct", title: "Fog, then gulls", body: "Couldn’t see the far bank until we were nearly there. Everyone went quiet at the same moment." },
      { id: "h1-2", date: "Thu 15 Oct", title: "The man with the thermos", body: "He offers the first cup to whoever looks coldest. Today it was me." },
    ],
  },
  {
    id: "lena",
    initial: c("lena").initial,
    pen: "Lena F.",
    title: "Thesis, Slowly",
    note: "A student in Berlin writing 300 words of thesis and one page about it, every day until March.",
    form: "Study log",
    tone: "raised",
    height: 0.9,
    width: 1,
    lastLeaf: "Saturday",
    leaves: [
      { id: "le-1", date: "Sat 24 Oct", title: "Chapter two has a spine now", body: "I moved one paragraph to the start and the whole chapter stood up. Three weeks of rewriting, solved by a cut and paste." },
      { id: "le-2", date: "Tue 13 Oct", title: "The library at 8", body: "Same desk, same window. I don’t think I write better there. I think I start faster." },
    ],
  },
  {
    id: "r1", initial: "R", pen: "night ledger", title: "The Night Shift Ledger", note: "Notes from a bakery that opens at four.", form: "Shift notes", tone: "ink", height: 0.76, width: 0, lastLeaf: "Friday",
    leaves: [
      { id: "r1-1", date: "Fri 23 Oct", title: "First batch at 4:10", body: "The oven runs hot on Fridays. Nobody knows why. We just start ten minutes later." },
      { id: "r1-2", date: "Tue 6 Oct", title: "Flour on everything", body: "Found a handprint on my notebook from last winter. Kept the page." },
    ],
  },
  {
    id: "g1", initial: "G", pen: "plot 42", title: "Allotment 42", note: "A small rented garden and what it teaches about waiting.", form: "Garden almanac", tone: "paper", height: 0.86, width: 2, lastLeaf: "in June", resting: true,
    leaves: [
      { id: "g1-1", date: "Sat 13 Jun", title: "Beans, finally", body: "Planted too early twice. The third time I waited, and they came up in a week." },
      { id: "g1-2", date: "Sun 31 May", title: "Borrowed a spade", body: "The neighbour on plot 41 lends tools and opinions in equal measure." },
    ],
  },
  {
    id: "theo",
    initial: c("theo").initial,
    pen: "Theo L.",
    title: "Drafts Before Coffee",
    note: "A writer’s first page of the day, before the rest of the day gets a vote.",
    form: "Morning pages",
    tone: "paper",
    height: 0.97,
    width: 1,
    lastLeaf: "Thursday",
    leaves: [
      { id: "th-1", date: "Thu 22 Oct", title: "The paragraph I didn’t cut", body: "I wrote a paragraph I loved and spent an hour trying to improve it. Every version was worse. So I put the first one back and went for a walk, which is the whole job some days.", fresh: true },
      { id: "th-2", date: "Mon 12 Oct", title: "Ten minutes is a real amount", body: "On the days I only manage ten minutes, the ten minutes still count. I’m writing that down so I believe it in November." },
    ],
  },
  {
    id: "c1", initial: "C", pen: "late cellist", title: "Learning Cello at Forty", note: "Twenty minutes of scales, then a page.", form: "Practice log", tone: "night", height: 0.88, width: 1, lastLeaf: "Sunday",
    leaves: [
      { id: "c1-1", date: "Sun 25 Oct", title: "The open C string", body: "My teacher says the lowest note is where you find out if you’re breathing. I wasn’t." },
      { id: "c1-2", date: "Wed 14 Oct", title: "Callus, day nine", body: "It stopped hurting today. I miss it slightly, the way you miss a reminder." },
    ],
  },
  {
    id: "w1", initial: "W", pen: "one good paragraph", title: "One Good Paragraph", note: "One paragraph a day, the best one I can manage.", form: "One paragraph", tone: "raised", height: 0.79, width: 0, lastLeaf: "Tuesday",
    leaves: [
      { id: "w1-1", date: "Tue 20 Oct", title: "On ironing", body: "My father ironed on Sunday nights with the radio on, and the smell of hot cotton still means the week is about to start." },
      { id: "w1-2", date: "Sat 10 Oct", title: "On waiting rooms", body: "Everyone in a waiting room is holding something very still." },
    ],
  },
  {
    id: "priya",
    initial: c("priya").initial,
    pen: "Priya N.",
    title: "Ninety Days to Yes",
    note: "A job search in Toronto, written one honest page at a time.",
    form: "Job search log",
    tone: "raised",
    height: 0.93,
    width: 2,
    lastLeaf: "Friday",
    leaves: [
      { id: "pr-1", date: "Fri 23 Oct", title: "Day 61: the no that helped", body: "The rejection came with two sentences of real feedback. I rewrote my portfolio intro the same night. Then I applied to the next one, because stopping is the only way this goes wrong.", fresh: true },
      { id: "pr-2", date: "Mon 12 Oct", title: "Day 50: half time", body: "Fifty pages. Eleven applications, four calls, one second round. I can see the shape of it now, which makes it less frightening." },
    ],
  },
  {
    id: "s1", initial: "S", pen: "small rooms", title: "Small Rooms, Big Light", note: "A flat with one good window.", form: "Three lines", tone: "paper", height: 0.74, width: 1, lastLeaf: "Thursday",
    leaves: [
      { id: "s1-1", date: "Thu 22 Oct", title: "Moved the desk", body: "Twenty centimetres to the left and the afternoon sun lands on the page now." },
      { id: "s1-2", date: "Fri 2 Oct", title: "Plants, a census", body: "Seven alive. One undecided." },
    ],
  },
  {
    id: "j1", initial: "J", pen: "the long way", title: "The Long Way Round", note: "Walking to work instead of driving, for a year.", form: "Walking notes", tone: "ink", height: 0.9, width: 1, lastLeaf: "Wednesday",
    leaves: [
      { id: "j1-1", date: "Wed 21 Oct", title: "Mile three", body: "There’s a gate on Elm Row that someone repaints every autumn. This year it’s green." },
      { id: "j1-2", date: "Mon 5 Oct", title: "Rain gear, finally", body: "Bought proper boots. The walk is a different walk now." },
    ],
  },
  {
    id: "kenji",
    initial: c("kenji").initial,
    pen: "Kenji M.",
    title: "Commit Messages to Myself",
    note: "A developer in Kyoto, writing the commit message for each day.",
    form: "Dev log",
    tone: "night",
    height: 0.84,
    width: 1,
    lastLeaf: "Saturday",
    leaves: [
      { id: "ke-1", date: "Sat 24 Oct", title: "fix: stop rewriting the working thing", body: "Spent the morning about to rewrite a module that has run without trouble for two years. Read it again instead. It’s fine. It was always fine. Closed the branch.", fresh: true },
      { id: "ke-2", date: "Tue 13 Oct", title: "chore: walk before standup", body: "Fifteen minutes along the river before the call. The call went better. I refuse to draw conclusions yet." },
    ],
  },
  {
    id: "e1", initial: "E", pen: "future clinic", title: "Letters to My Future Clinic", note: "A nursing student writing to the nurse she’ll be.", form: "Placement log", tone: "paper", height: 0.95, width: 0, lastLeaf: "Monday",
    leaves: [
      { id: "e1-1", date: "Mon 19 Oct", title: "Ask the second question", body: "The patient said ‘fine’. I asked again, slower. It wasn’t fine, and now someone knows." },
      { id: "e1-2", date: "Thu 8 Oct", title: "Shoes", body: "Note to future me: buy the good shoes first. Everything else can wait." },
    ],
  },
  {
    id: "b1", initial: "B", pen: "bread, mostly", title: "Bread, Mostly", note: "Sourdough, and the days around it.", form: "Bake log", tone: "raised", height: 0.8, width: 2, lastLeaf: "Sunday",
    leaves: [
      { id: "b1-1", date: "Sun 25 Oct", title: "Loaf 31", body: "The first one I’d give to someone without apologising." },
      { id: "b1-2", date: "Sat 17 Oct", title: "Starter, renamed", body: "It’s called Gerald now. It behaves better with a name." },
    ],
  },
  {
    id: "o1", initial: "O", pen: "tram roof", title: "Rain on the Tram Roof", note: "Commute pages, written standing up.", form: "Three lines", tone: "night", height: 0.72, width: 0, lastLeaf: "in July", resting: true,
    leaves: [
      { id: "o1-1", date: "Wed 15 Jul", title: "Last tram page", body: "Got a bike. These pages might stop. Thank you, tram." },
      { id: "o1-2", date: "Fri 3 Jul", title: "Window seat", body: "A child drew a face in the fog on the glass and it lasted three stops." },
    ],
  },
  {
    id: "ana",
    initial: c("ana").initial,
    pen: "Dina D.",
    title: "Notes from Room 14",
    note: "A primary teacher in Porto, one page after the bell.",
    form: "After the bell",
    tone: "paper",
    height: 0.89,
    width: 1,
    lastLeaf: "Thursday",
    leaves: [
      { id: "an-1", date: "Thu 22 Oct", title: "The quiet one spoke", body: "Ten seconds of silence after a question is long. I waited twelve, and the quietest girl in the room answered." },
      { id: "an-2", date: "Fri 16 Oct", title: "Paint everywhere", body: "We painted autumn. Some of it is on the ceiling. I’ll explain it to the caretaker on Monday." },
    ],
  },
  {
    id: "y1", initial: "Y", pen: "slow runner", title: "A Runner’s Slow Year", note: "Running slower on purpose, and writing about it.", form: "Run log", tone: "raised", height: 0.85, width: 1, lastLeaf: "Saturday",
    leaves: [
      { id: "y1-1", date: "Sat 24 Oct", title: "Ten kilometres, talking", body: "Ran the whole thing at a pace where I could still talk. My friend talked. I listened. Best run of the month." },
      { id: "y1-2", date: "Sun 11 Oct", title: "Rest day, honestly", body: "Didn’t run. Didn’t feel guilty. Writing that down as progress." },
    ],
  },
  {
    id: "f1", initial: "F", pen: "ward notes", title: "Ward Notes", note: "A porter’s view of a hospital at night.", form: "Shift notes", tone: "ink", height: 0.92, width: 2, lastLeaf: "Tuesday",
    leaves: [
      { id: "f1-1", date: "Tue 20 Oct", title: "Corridor C", body: "The longest corridor in the building, and the one where people say the truest things." },
      { id: "f1-2", date: "Fri 9 Oct", title: "Tea round", body: "Night tea at three. The kettle in ward six is the only one that works properly." },
    ],
  },
  {
    id: "q1", initial: "Q", pen: "unfinished quilt", title: "The Unfinished Quilt", note: "One square a week, from old shirts.", form: "Weekly square", tone: "paper", height: 0.77, width: 1, lastLeaf: "Sunday",
    leaves: [
      { id: "q1-1", date: "Sun 25 Oct", title: "Square 19", body: "My brother’s school shirt. I left the ink stain in." },
      { id: "q1-2", date: "Sun 18 Oct", title: "Square 18", body: "Blue check. It doesn’t match anything. That’s the point." },
    ],
  },
  {
    id: "nani",
    initial: c("nani").initial,
    pen: "Nani",
    title: "Nani’s Kitchen Book",
    note: "A grandmother in Hyderabad, one recipe and one memory at a time.",
    form: "Recipe & memory",
    tone: "raised",
    height: 0.98,
    width: 2,
    lastLeaf: "Sunday",
    leaves: [
      { id: "na-1", date: "Sun 25 Oct", title: "Dal, the way you all like it", body: "Less tamarind than my mother used. More garlic than my mother would allow. Stir until the kitchen smells like Sunday." },
      { id: "na-2", date: "Wed 14 Oct", title: "The steel tiffin", body: "Your grandfather carried it to the office for thirty years. It still closes with the same click." },
    ],
  },
  {
    id: "v1", initial: "V", pen: "canal walker", title: "Walking the Canal", note: "The towpath, end to end, one stretch a week.", form: "Walking notes", tone: "night", height: 0.83, width: 1, lastLeaf: "Saturday",
    leaves: [
      { id: "v1-1", date: "Sat 24 Oct", title: "Lock 12", body: "A narrowboat called Patience waited forty minutes for the lock and nobody on board seemed to mind." },
      { id: "v1-2", date: "Sat 10 Oct", title: "Herons", body: "Counted three. One stayed so still I thought it was a sign." },
    ],
  },
  {
    id: "i1", initial: "I", pen: "second language", title: "Second Language Diary", note: "Every page in Portuguese, mistakes included.", form: "Language log", tone: "paper", height: 0.87, width: 0, lastLeaf: "in May", resting: true,
    leaves: [
      { id: "i1-1", date: "Thu 21 May", title: "Hoje", body: "Escrevi uma página inteira sem dicionário. Errei tudo, mas escrevi." },
      { id: "i1-2", date: "Mon 4 May", title: "Week one", body: "Ordered coffee in Portuguese. Received tea. Counting it." },
    ],
  },
  {
    id: "u1", initial: "U", pen: "old bike", title: "Fixing the Old Bike", note: "A 1982 road bike, rebuilt one part at a time.", form: "Workshop log", tone: "raised", height: 0.75, width: 1, lastLeaf: "Friday",
    leaves: [
      { id: "u1-1", date: "Fri 23 Oct", title: "The brakes, at last", body: "It stops now. That changes how fast I let it go." },
      { id: "u1-2", date: "Tue 13 Oct", title: "Bearings", body: "Tiny steel balls, all over the floor. Found forty of forty-two." },
    ],
  },
  {
    id: "z1", initial: "Z", pen: "corner shop", title: "Small Shop, Long Sundays", note: "Running a corner shop with my mum.", form: "Shop log", tone: "ink", height: 0.91, width: 1, lastLeaf: "Sunday",
    leaves: [
      { id: "z1-1", date: "Sun 25 Oct", title: "The regulars", body: "Mr Daley buys one lemon every Sunday. I’ve never asked why. I don’t want to know." },
      { id: "z1-2", date: "Wed 7 Oct", title: "New shelves", body: "Mum moved the biscuits nearer the till. Sales up, her told-you-so face even more so." },
    ],
  },
  {
    id: "d1", initial: "D", pen: "dad notes", title: "Dad Notes", note: "A new father, one page a night, mostly at 3am.", form: "Three lines", tone: "paper", height: 0.81, width: 2, lastLeaf: "Thursday",
    leaves: [
      { id: "d1-1", date: "Thu 22 Oct", title: "Week nine", body: "She grabbed my finger and didn’t let go. I wrote this one-handed." },
      { id: "d1-2", date: "Fri 9 Oct", title: "The swaddle", body: "I can do it in the dark now. My one new skill this year." },
    ],
  },
  {
    id: "a1", initial: "A", pen: "quiet ascent", title: "The Quiet Ascent", note: "Learning to climb, indoors, slowly.", form: "Session log", tone: "night", height: 0.78, width: 0, lastLeaf: "Monday",
    leaves: [
      { id: "a1-1", date: "Mon 19 Oct", title: "The yellow route", body: "Fell off the last hold four times. The fifth time I didn’t look down." },
      { id: "a1-2", date: "Thu 1 Oct", title: "Chalk", body: "My hands smell of it all day. I like knowing where I’ve been." },
    ],
  },
  {
    id: "m1", initial: "M", pen: "kitchen physics", title: "Kitchen Table Physics", note: "A retired teacher explaining one thing a day to her grandson.", form: "One question", tone: "raised", height: 0.94, width: 1, lastLeaf: "Wednesday",
    leaves: [
      { id: "m1-1", date: "Wed 21 Oct", title: "Why the kettle sings", body: "Bubbles collapsing before they reach the top. He asked why it goes quiet just before it boils. Very good question." },
      { id: "m1-2", date: "Tue 13 Oct", title: "Ice in the glass", body: "We watched it melt for ten minutes. He wanted to know where the cold went." },
    ],
  },
  {
    id: "l1", initial: "L", pen: "postcards", title: "Postcards I Didn’t Send", note: "Short notes to people I miss.", form: "One postcard", tone: "paper", height: 0.86, width: 1, lastLeaf: "Saturday",
    leaves: [
      { id: "l1-1", date: "Sat 24 Oct", title: "To the flat on Calle Luna", body: "The upstairs neighbour still plays piano badly, I’d guess. I hope so." },
      { id: "l1-2", date: "Sun 4 Oct", title: "To my old teacher", body: "You said I’d write one day. I write every day now, mostly lists, but it counts." },
    ],
  },
  {
    id: "k1", initial: "K", pen: "attempt three", title: "Becoming a Morning Person (Attempt 3)", note: "Up at six, for real this time.", form: "Morning pages", tone: "ink", height: 0.96, width: 1, lastLeaf: "Friday",
    leaves: [
      { id: "k1-1", date: "Fri 23 Oct", title: "Day 18", body: "Still awake at six. Still don’t like it. Liking it was never the plan." },
      { id: "k1-2", date: "Mon 12 Oct", title: "Day 7", body: "The light at 6:40 is worth it. The light at 6:01 is not." },
    ],
  },
  {
    id: "x1", initial: "X", pen: "field recordings", title: "Field Recordings", note: "Sounds I recorded today, described in words.", form: "One sound", tone: "paper", height: 0.73, width: 0, lastLeaf: "Tuesday",
    leaves: [
      { id: "x1-1", date: "Tue 20 Oct", title: "Rain on a bus shelter", body: "Like someone typing very fast on a tin roof, then stopping to think." },
      { id: "x1-2", date: "Sat 3 Oct", title: "Market, 8am", body: "Crates, a radio, someone laughing in the next street." },
    ],
  },
];

/** The writer's own colophon. */
export const MY_COLOPHON = {
  pen: "The Evening Desk",
  handle: "evening-desk",
  note:
    "Small pages from a desk by a window. Mostly about finishing things before I feel ready, and the evenings that make room for it.",
  form: {
    name: "Three things & a promise",
    fields: ["What did I make today?", "What’s on my mind?", "One thing I finished", "Tomorrow I promise to…"],
  },
  openWorks: [
    { id: "w-bread", title: "Bake twelve loaves", unit: "loaves", done: 7, of: 12, note: "Loaf 7 was the first I’d give away." },
    { id: "w-shelf", title: "Build the bookshelf", unit: "evenings", done: 5, of: 5, note: "Finished tonight. All five shelves, and the books are on it." },
    { id: "w-novel", title: "Novel draft", unit: "chapters", done: 3, of: 12, note: "Chapter 4 is open on the desk." },
  ],
  volumes: [
    { id: "v-make", title: "Making Things, Vol. I", chapters: ["August: the first loaf", "September: drafts", "October: the bookshelf"], leaves: 19 },
    { id: "v-read", title: "Read Slowly", chapters: ["September: Middlemarch, books I–III"], leaves: 6 },
  ],
};

export const MY_LEAVES: Leaf[] = [
  {
    id: "me-1",
    date: "Tue 20 Oct",
    title: "Drafts for a braver me",
    body:
      "Half my drafts are waiting for a braver version of me to finish them. Tonight I wondered if she’s just me on a good Thursday, and finished one.",
  },
  {
    id: "me-2",
    date: "Sun 11 Oct",
    title: "The loaf I gave away",
    body: "Loaf seven went next door. I didn’t apologise for the crust. That’s the whole leaf.",
  },
  {
    id: "me-3",
    date: "Wed 30 Sep",
    title: "Chapter three, sealed",
    body: "Three chapters of twelve. I wrote the last page of this one on the floor because the desk was covered in shelf brackets.",
  },
];

/** Today's private page, which becomes a leaf on the Publish screen. */
export const TODAYS_PAGE = {
  weekday: "Thursday",
  date: "29 October",
  title: "Finishing before I’m ready",
  fields: [
    {
      id: "mind",
      prompt: "What’s on my mind?",
      kind: "long" as const,
      value:
        "Rang Dr. Mehta about the scan this morning. Everything is fine. I walked across Clapham Common to let that land, then spent the evening finishing the bookshelf instead of rereading the email. Sanjay helped me carry the boards up. I only ever finish things once I’ve stopped waiting to feel ready.",
      defaultOn: true,
    },
    { id: "finished", prompt: "One thing I finished", kind: "short" as const, value: "The bookshelf. All five shelves.", defaultOn: true },
    { id: "mood", prompt: "Mood", kind: "scale" as const, value: "4 of 5 · relieved", defaultOn: false },
    { id: "energy", prompt: "Energy", kind: "scale" as const, value: "2 of 5", defaultOn: false },
    { id: "tags", prompt: "Tags", kind: "tags" as const, value: "#making #home #health", defaultOn: false },
  ],
};

/** Names, places and over-specific details Kata offers to clean out of a leaf. */
export const CLEANUPS = [
  { id: "dr", find: "Dr. Mehta", replace: "my doctor", why: "A name" },
  { id: "place", find: "Clapham Common", replace: "the common", why: "A place you can be found" },
  { id: "friend", find: "Sanjay", replace: "A friend", why: "Someone who didn’t choose to be in it" },
  { id: "scan", find: "about the scan", replace: "about some results", why: "Health detail" },
];

export const VOLUME_OPTIONS = ["Not in a volume", "Making Things, Vol. I", "Read Slowly"];

/** The edition's three leaves, from people already on the shelf. */
export const EDITION = {
  date: "Sunday 25 October",
  letterTail:
    "You wrote six pages this week, and on Tuesday you finished a draft you’d been carrying since August. You called it a good Thursday, on a Tuesday. I’m keeping that.",
  editorsNote:
    "Three of the people you keep wrote about leaving well enough alone. Theo kept a paragraph, Kenji kept a function, and Priya kept going.",
  leaves: [
    { bookId: "theo", leafId: "th-1" },
    { bookId: "kenji", leafId: "ke-1" },
    { bookId: "priya", leafId: "pr-1" },
  ],
  kindred: {
    bookId: "mira",
    /** The word Kata noticed in both. */
    rhyme: "braver",
    theirs: { date: "Thursday", text: "I keep a list called ‘when I’m braver’. Tonight I did the first thing on it." },
    yours: { date: "Tuesday", leaf: "Drafts for a braver me", text: "Half my drafts are waiting for a braver version of me to finish them." },
  },
};

/** The seal book: authors you've written a marginal note to, and how many notes. */
export const SEAL_BOOK: { bookId: string; notes: number }[] = [
  { bookId: "nani", notes: 4 },
  { bookId: "arjun", notes: 3 },
  { bookId: "theo", notes: 2 },
  { bookId: "lena", notes: 1 },
  { bookId: "ana", notes: 1 },
  { bookId: "b1", notes: 2 },
  { bookId: "e1", notes: 1 },
];

export const bookById = (id: string) => (id === MIRA.id ? MIRA : BOOKS.find((b) => b.id === id)!);
