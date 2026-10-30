// Demo content for the Circles prototype. Fictional people and lines; nothing is real.
import type { IconName } from "@/components/shared/Icon";

/** Five faces, the same default scale as the mood field. */
export const MOODS = ["😞", "😕", "😐", "🙂", "😄"] as const;

export type SealState = "inked" | "blank" | "resting";

export interface Offering {
  personId: string;
  state: SealState;
  /** Mood, 1–5, when they offered it. */
  mood?: number;
  line?: string;
  /** Where and when, in their own time zone. */
  when?: string;
  byEmail?: boolean;
}

export interface MarginNote {
  from: string;
  beside: string;
  text: string;
}

export interface Circle {
  id: string;
  name: string;
  short: string;
  since: string;
  members: string[];
  /** Tonight (Wednesday) in the evening row, other members only. */
  tonight: Offering[];
  /** How many members wrote each day, Monday to Sunday (Wednesday excludes you). */
  week: number[];
  /** Notes others tucked beside your lines. Only you see these. */
  notesForYou: MarginNote[];
}

export const CIRCLES: Circle[] = [
  {
    id: "rao",
    name: "The Rao family",
    short: "Rao family",
    since: "Hyderabad, Bengaluru, Toronto, Porto",
    members: ["nani", "arjun", "priya", "ana"],
    tonight: [
      { personId: "nani", state: "inked", mood: 4, line: "I made the dal you all like.", when: "Hyderabad · 7:05 pm", byEmail: true },
      { personId: "arjun", state: "inked", mood: 3, line: "Shipped at 2 a.m. So tired the code started looking like poetry.", when: "Bengaluru · 11:48 pm" },
      { personId: "priya", state: "inked", mood: 2, line: "Third interview this week. So tired I ironed the same shirt twice.", when: "Toronto · 6:30 pm" },
      { personId: "ana", state: "inked", mood: 4, line: "Thirty-one essays marked. Tired in the good way, mostly.", when: "Porto · 9:15 pm" },
    ],
    week: [5, 4, 4, 5, 3, 4, 0],
    notesForYou: [
      { from: "nani", beside: "Monday", text: "The bakery that closes early is the best one. Take me when I visit." },
      { from: "priya", beside: "Tuesday", text: "You fixed a tap? Teach me. My landlord is a ghost." },
    ],
  },
  {
    id: "rosa",
    name: "Rua da Rosa",
    short: "Rua da Rosa",
    since: "The old flat, 2018 to 2021",
    members: ["mira", "lena", "theo", "kenji"],
    tonight: [
      { personId: "mira", state: "inked", mood: 4, line: "Walked past the old flat. Someone has painted our door green.", when: "Lisbon · 8:20 pm" },
      { personId: "lena", state: "inked", mood: 2, line: "Exam in nine days. I have highlighted the whole book, which helps nobody.", when: "Berlin · 10:02 pm" },
      { personId: "theo", state: "resting" },
      { personId: "kenji", state: "blank" },
    ],
    week: [4, 3, 2, 4, 4, 2, 0],
    notesForYou: [{ from: "mira", beside: "Tuesday", text: "For the record, the old flat’s tap is still dripping." }],
  },
];

export const circleById = (id: string) => CIRCLES.find((c) => c.id === id)!;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Your own lines this week. Wednesday is whatever you seal on the Tonight screen. */
export interface MyDay {
  id: string;
  day: string;
  date: string;
  mood: number;
  line: string | null;
}

export const MY_WEEK: MyDay[] = [
  { id: "mon", day: "Monday", date: "19 Oct", mood: 4, line: "Walked home the long way, past the bakery that closes early." },
  { id: "tue", day: "Tuesday", date: "20 Oct", mood: 4, line: "Fixed the leaking tap myself. Told nobody, until now." },
  { id: "wed", day: "Wednesday", date: "21 Oct", mood: 2, line: null },
  { id: "thu", day: "Thursday", date: "22 Oct", mood: 5, line: "Slept nine hours. Felt like a new person, briefly." },
  { id: "fri", day: "Friday", date: "23 Oct", mood: 3, line: "Cooked Nani’s dal from her video. It was not Nani’s dal." },
  { id: "sat", day: "Saturday", date: "24 Oct", mood: 4, line: "Slow morning. Coffee, rain, the good chair." },
];

export const DEFAULT_LINE = "Long day. Too tired to cook, so it was toast for dinner.";
export const DEFAULT_MOOD = 2;

/** Lines the others offered this week, by count, for the letter's opening. */
export const OTHERS_LINE_COUNT = 24;

/** The fields on your evening page, and whether each is offered to your circles. */
export type FieldKind = "line" | "mood" | "long" | "promises" | "number";

export interface PageField {
  id: string;
  kind: FieldKind;
  label: string;
  typeLabel: string;
  icon: IconName;
  offered: boolean;
}

export const DEFAULT_FIELDS: PageField[] = [
  { id: "line", kind: "line", label: "One line for my people", typeLabel: "Short text", icon: "text-short", offered: true },
  { id: "mood", kind: "mood", label: "How was today?", typeLabel: "Mood", icon: "smile", offered: true },
  { id: "drained", kind: "long", label: "What drained me?", typeLabel: "Long text", icon: "text-long", offered: false },
  { id: "promises", kind: "promises", label: "Promises to myself", typeLabel: "To-do", icon: "check", offered: false },
  { id: "sleep", kind: "number", label: "Hours slept", typeLabel: "Number", icon: "hash", offered: false },
];

/** Tonight's answers to the private fields, as they'd appear if offered. */
export const SAMPLE = {
  drained: "The four o’clock meeting that could have been an email, and then the bus that didn’t come.",
  promises: [
    { text: "Reply to the landlord", done: true },
    { text: "Call Nani on Sunday", done: false },
  ],
  sleep: 6,
};

export interface Intention {
  personId: string;
  text: string;
  kept: string | null;
}

export const INTENTIONS: Intention[] = [
  { personId: "nani", text: "Teach Priya the dal on a video call.", kept: "Kept Saturday" },
  { personId: "arjun", text: "Asleep before midnight, twice.", kept: null },
  { personId: "priya", text: "Two good applications, not ten.", kept: "Kept Friday" },
  { personId: "ana", text: "Swim once more before the sea turns cold.", kept: "Kept Monday" },
];

export const MY_INTENTION = "Call Nani on Sunday.";

/** Lines the letter weaves in from the others (offered, quoted word for word). */
export const WOVEN = {
  naniThu: "Planted the curry leaf. It will outlive all of us.",
  arjunThu: "A stranger signed up. A real one. I checked twice.",
  anaMon: "The sea was warmer than the staff room.",
  priyaReply: "Tell Arjun to eat something green.",
  arjunAnswer: "Chai leaves are green.",
};
