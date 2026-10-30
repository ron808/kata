// Demo content for the Sealed prototype. Fictional pages, people and dates only.
// "Today" is fixed so every countdown reads the same for whoever opens the prototype.

export const EASE = [0.22, 1, 0.36, 1] as const;

export const TODAY = "2026-10-29";

const DAY = 86_400_000;
const parse = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

export function addDays(iso: string, n: number) {
  return new Date(parse(iso) + n * DAY).toISOString().slice(0, 10);
}

function addYears(iso: string, n: number) {
  const [y, m, d] = iso.split("-");
  return `${Number(y) + n}-${m}-${d}`;
}

export function daysUntil(iso: string) {
  return Math.round((parse(iso) - parse(TODAY)) / DAY);
}

/** "opens in 23 days", "opens in 2 years, 41 days". */
export function countdown(iso: string) {
  const days = daysUntil(iso);
  if (days <= 0) return "opens this Sunday";
  if (days < 365) return `opens in ${days} ${days === 1 ? "day" : "days"}`;
  let y = 0;
  while (parse(addYears(TODAY, y + 1)) <= parse(iso)) y++;
  const rest = Math.round((parse(iso) - parse(addYears(TODAY, y))) / DAY);
  const years = `${y} ${y === 1 ? "year" : "years"}`;
  return rest ? `opens in ${years}, ${rest} ${rest === 1 ? "day" : "days"}` : `opens in ${years}`;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts });
const LONG = fmt({ day: "numeric", month: "long", year: "numeric" });
const SHORT = fmt({ day: "numeric", month: "short", year: "numeric" });
const DAYMONTH = fmt({ day: "numeric", month: "long" });
const WEEKDAY = fmt({ weekday: "long" });
const MONTH = fmt({ month: "short" });

export const longDate = (iso: string) => LONG.format(parse(iso));
export const shortDate = (iso: string) => SHORT.format(parse(iso));
export const dayMonth = (iso: string) => DAYMONTH.format(parse(iso));
export const weekday = (iso: string) => WEEKDAY.format(parse(iso));
export const monthShort = (iso: string) => MONTH.format(parse(iso));

/* ── Screen 1: today's page and the ways it can open ─────────────────────── */

export const TODAYS_PAGE = {
  number: 431,
  mind: "Signed the lease on the flat with the green door. Boxes everywhere, no kettle yet, and the radiator knocks like it wants to be let in. I keep wondering if I’ll still love this street in a year, or if I’ll just stop noticing it.",
  note: "Dear me, a year from now: is the door still green? Did you ever hang the prints, or are they still leaning against the hallway wall? Tell me which neighbour you got to know first.",
  label: "The green door, a year in",
};

export type OpensKind = "date" | "promise" | "person" | "group";

export const KINDS: { id: OpensKind; label: string; hint: string }[] = [
  { id: "date", label: "On a date", hint: "A day you choose" },
  { id: "promise", label: "When a promise is kept", hint: "One of your to-dos" },
  { id: "person", label: "For someone", hint: "On their day" },
  { id: "group", label: "With a group", hint: "Everyone opens together" },
];

export const DATE_PRESETS = [
  { id: "month", label: "In a month", iso: addDays(TODAY, 31) },
  { id: "year", label: "In a year", iso: "2027-10-29" },
  { id: "birthday", label: "On my birthday", iso: "2027-02-14" },
  { id: "five", label: "In five years", iso: "2031-10-29" },
];

export const OPEN_PROMISES = [
  { id: "prints", text: "Hang the prints in the hallway", since: "2026-10-26" },
  { id: "dinner", text: "Have the neighbours over for dinner", since: "2026-10-27" },
  { id: "swim", text: "Swim a kilometre without stopping", since: "2026-09-02" },
];

/** If a promise is never kept, the page opens anyway on this day. */
export const PROMISE_FALLBACK = "2027-10-29";

export const BIRTHDAYS: Record<string, string> = {
  mira: "2026-11-21",
  arjun: "2027-04-03",
  lena: "2027-06-18",
  theo: "2027-01-09",
  priya: "2027-08-30",
  kenji: "2027-05-12",
  ana: "2027-03-02",
  nani: "2027-03-14",
};

/** People not on Kata get their capsule as a letter by email. */
export const NOT_ON_KATA = new Set(["nani"]);

export const GROUP_OPENS = "2028-01-01";

/* ── Screen 2: the shelf ─────────────────────────────────────────────────── */

export interface Keeper {
  initial: string;
  name: string;
  /** Has this keeper added anything yet. */
  inked: boolean;
}

export interface Capsule {
  id: string;
  label: string;
  kind: OpensKind | "kept";
  sealedOn: string;
  /** The day it opens; for a promise, the fallback day. */
  opensOn: string;
  promise?: string;
  to?: string;
  contents: string;
  keepers?: Keeper[];
  byEmail?: boolean;
}

export function shelfFor(me: { first: string; initial: string }): Capsule[] {
  return [
    {
      id: "offer",
      label: "For the day I get the offer",
      kind: "promise",
      sealedOn: "2025-08-26",
      opensOn: "2027-08-26",
      promise: "Get the offer",
      contents: "1 page and a note to yourself",
    },
    {
      id: "mira",
      label: "Mira at thirty",
      kind: "kept",
      sealedOn: "2025-11-21",
      opensOn: BIRTHDAYS.mira,
      to: "Mira",
      contents: "41 memories from 8 keepers",
      keepers: [
        { initial: me.initial, name: me.first, inked: true },
        { initial: "A", name: "Arjun", inked: true },
        { initial: "L", name: "Lena", inked: true },
        { initial: "T", name: "Theo", inked: true },
        { initial: "P", name: "Priya", inked: true },
        { initial: "K", name: "Kenji", inked: true },
        { initial: "D", name: "Dina", inked: true },
        { initial: "N", name: "Ngozi", inked: true },
      ],
    },
    {
      id: "dad",
      label: "I’ll call Dad every Sunday this autumn",
      kind: "person",
      sealedOn: "2026-09-06",
      opensOn: "2026-12-20",
      to: "Dad",
      byEmail: true,
      contents: "A promise, and what happened",
    },
    {
      id: "nani",
      label: "Eighty things about Nani",
      kind: "person",
      sealedOn: "2026-03-14",
      opensOn: BIRTHDAYS.nani,
      to: "Nani",
      byEmail: true,
      contents: "23 pages so far",
    },
    {
      id: "our2027",
      label: "Our 2027",
      kind: "group",
      sealedOn: "2026-10-12",
      opensOn: GROUP_OPENS,
      contents: "Pages from 5 people, none seen yet",
      keepers: [
        { initial: me.initial, name: me.first, inked: true },
        { initial: "L", name: "Lena", inked: true },
        { initial: "T", name: "Theo", inked: true },
        { initial: "A", name: "Arjun", inked: false },
        { initial: "K", name: "Kenji", inked: false },
      ],
    },
    {
      id: "forty",
      label: "Read this at forty",
      kind: "date",
      sealedOn: "2024-02-14",
      opensOn: "2031-02-14",
      contents: "3 pages and a letter",
    },
  ];
}

/* ── Screen 3: kept for Mira ─────────────────────────────────────────────── */

export const MIRA = {
  turns: 30,
  opens: BIRTHDAYS.mira,
  keepers: [
    { id: "arjun", initial: "A", name: "Arjun", count: 7, last: "2 days ago" },
    { id: "lena", initial: "L", name: "Lena", count: 4, last: "a week ago" },
    { id: "theo", initial: "T", name: "Theo", count: 9, last: "yesterday" },
    { id: "priya", initial: "P", name: "Priya", count: 3, last: "in August" },
    { id: "kenji", initial: "K", name: "Kenji", count: 6, last: "4 days ago" },
    { id: "ana", initial: "D", name: "Dina", count: 2, last: "in September" },
    { id: "ngozi", initial: "N", name: "Ngozi, her mum", count: 5, last: "on Sunday, by email", email: true },
  ],
  mine: [
    { date: "2025-12-03", text: "The night the 28 tram broke down on the hill and you got the whole carriage singing until the replacement came." },
    { date: "2026-02-11", text: "You redrew my wedding invitation at 1am because the ampersand ‘looked lonely’. It did." },
    { date: "2026-05-19", text: "How you say ‘okay, okay, okay’ when you’re about to agree to something brave." },
    { date: "2026-07-30", text: "The fig you bought for the balcony that you talk to more than your plants." },
    { date: "2026-09-08", text: "You sent me a photo of a door every day the week I was waiting for news." },
  ],
  /** Passages from your own pages that mention Mira. */
  fromPages: [
    { id: "p1", date: "2026-10-04", text: "Mira called during the storm just to say the sea looked like it was boiling. Twenty minutes of the two of us listening to weather." },
    { id: "p2", date: "2026-10-21", text: "Lunch with Mira. She said I’ve started finishing my sentences again. I didn’t know I’d stopped." },
  ],
};

export const MIRA_TOTAL = MIRA.mine.length + MIRA.keepers.reduce((n, k) => n + k.count, 0);

/* ── Screen 4: opening morning ───────────────────────────────────────────── */

export const SUNDAY = "2026-11-01";

export const PROMISES_THIS_WEEK = [
  { id: "offer", text: "Get the offer", since: "2025-06-12", sealed: true },
  { id: "priya", text: "Send Priya notes on her portfolio", since: "2026-10-26" },
  { id: "books", text: "Return the library books", since: "2026-10-27" },
];

export const SEALED_PAGE = {
  date: "2025-08-26",
  number: 203,
  /** The note for whoever opens it. Kata lays it on top: it is the first thing you read. */
  note: {
    prompt: "A note to whoever opens this",
    lead: "If you’re reading this, you got it.",
    rest: "I hope you remember the car park. I hope you tell them something true in the first week, and I hope you buy the good coffee.",
    now: "You signed the contract on Thursday, on the library’s wifi, parked in the same spot.",
  },
  sections: [
    {
      prompt: "What happened today?",
      text: "Northlight’s final round went quiet for nine days and then a two-line email. No. That’s the fourth no since June. I sat in the car outside the library for an hour because I didn’t want to explain it at home yet.",
      then: "That day you couldn’t face saying it out loud.",
      now: "Two weeks later you started a list called ‘what each no taught me’. It ran to three pages by March, and you reread it before every interview after.",
    },
    {
      prompt: "What am I afraid of?",
      text: "That I’m not getting better at this, just more tired. That I’ll take the first thing that says yes because I can’t do another month of this.",
      then: "You were afraid you’d take the first yes.",
      now: "In July you turned one down. You wrote: ‘it felt like settling, and now I know what settling feels like.’",
    },
  ],
};
