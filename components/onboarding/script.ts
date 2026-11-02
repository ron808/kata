import type { RoleKey } from "@/lib/types";

// What Kata says while setting someone up, and the choices it offers. Short, specific and
// true: everything here describes what the product actually does next.

export type CheckIn = "morning" | "evening" | "both";

export const MAX_FOCUS = 6;
export const MAX_INTERESTS = 12;

export const ROLES: { key: RoleKey; label: string; said: string; ack: string }[] = [
  {
    key: "developer",
    label: "Developer",
    said: "I’m a developer.",
    ack: "Nice. I’ll keep an eye on what you ship and what’s in your way.",
  },
  {
    key: "designer",
    label: "Designer",
    said: "I’m a designer.",
    ack: "Nice. I’ll ask what you made, what feedback came back and what inspired you.",
  },
  {
    key: "founder",
    label: "Founder",
    said: "I run a company.",
    ack: "Got it. I’ll help you keep track of decisions, risks and the people you talk to.",
  },
  {
    key: "freelancer",
    label: "Freelancer",
    said: "I work for myself.",
    ack: "Good. I’ll keep track of clients and deadlines, and ask who still owes you.",
  },
  {
    key: "teacher",
    label: "Teacher",
    said: "I teach.",
    ack: "Nice. I’ll ask what landed with your class, what didn’t, and how you’re holding up.",
  },
  {
    key: "healthcare",
    label: "Healthcare",
    said: "I work in healthcare.",
    ack: "Thank you for that work. I’ll keep track of your rest and what you want to remember.",
  },
  {
    key: "shift_worker",
    label: "Shift work",
    said: "I work shifts.",
    ack: "Got it. I’ll keep my questions short and keep an eye on rest between shifts.",
  },
  {
    key: "creative",
    label: "Artist or maker",
    said: "I make things: art, music, words.",
    ack: "Lovely. I’ll ask what you made, where you’re stuck and what fed you.",
  },
  {
    key: "student",
    label: "Student",
    said: "I’m a student.",
    ack: "Nice. I’ll ask what you studied, what clicked and what didn’t.",
  },
  {
    key: "job_seeker",
    label: "Job seeker",
    said: "I’m looking for work.",
    ack: "Got it. I’ll keep track of applications, replies and what you practise.",
  },
  {
    key: "parent",
    label: "Parent or carer",
    said: "I look after someone.",
    ack: "That’s a lot to hold. I’ll keep track of their things and yours, and the small wins.",
  },
  {
    key: "athlete",
    label: "Training for something",
    said: "I’m training for something.",
    ack: "Nice. I’ll keep track of sessions, rest and how your body feels.",
  },
  {
    key: "wellbeing",
    label: "Looking after myself",
    said: "I’m looking after myself.",
    ack: "Good. We’ll keep it gentle: sleep, moods and small habits.",
  },
  {
    key: "retired",
    label: "Retired",
    said: "I’m retired.",
    ack: "Lovely. I’ll ask about your days, the people in them and what you’re enjoying.",
  },
  {
    key: "custom",
    label: "Something else",
    said: "Something else.",
    ack: "Good. We’ll start simple and shape your page as we go.",
  },
];

export function roleInfo(key: RoleKey) {
  return ROLES.find((r) => r.key === key) ?? ROLES[ROLES.length - 1];
}

/** Things people in each role tend to have on the go. Picking one makes it a thread. */
export const FOCUS_IDEAS: Record<RoleKey, string[]> = {
  developer: ["Next release", "Code reviews", "Side project", "Learning Rust", "Gym"],
  designer: ["Portfolio refresh", "Client project", "Design review", "Daily sketching", "Gym"],
  founder: ["Fundraising", "Hiring", "Customer calls", "Product launch", "Sleep routine"],
  freelancer: ["Client project", "Send invoices", "Find new work", "Update my portfolio", "Taxes"],
  teacher: ["Lesson planning", "Marking", "Parents’ evening", "School trip", "Weekend rest"],
  healthcare: ["Next shift", "Training course", "Rest days", "Paperwork", "Proper meals"],
  shift_worker: ["Next rota", "Sleep routine", "Saving up", "Day off plans", "Learning to drive"],
  creative: ["Current piece", "Show or gig", "Daily practice", "Selling my work", "Finding inspiration"],
  student: ["Exams", "Thesis", "Problem sets", "Internship search", "Sleep routine"],
  job_seeker: ["Job hunt", "Interview prep", "Portfolio", "Networking", "Gym"],
  parent: ["School run", "Appointments", "Time to myself", "Family dinners", "Paperwork"],
  athlete: ["Race day", "Training plan", "Rest days", "Stretching", "Eat well"],
  wellbeing: ["Sleep earlier", "Walk daily", "Drink more water daily", "Call a friend", "Screen time"],
  retired: ["Garden", "Time with friends", "Walk daily", "A trip", "A new skill"],
  custom: ["Side project", "Reading", "Gym", "Sleep routine", "Family time"],
};

/** Interests that suit each role go first; the rest of the question bank's tags follow. */
const ROLE_INTERESTS: Record<RoleKey, string[]> = {
  developer: ["shipping", "blockers", "focus", "learning", "sleep", "fitness"],
  designer: ["design", "creativity", "focus", "learning", "mood", "sleep"],
  founder: ["planning", "focus", "money", "sleep", "family", "reflection"],
  freelancer: ["money", "planning", "focus", "work", "rest", "creativity"],
  teacher: ["work", "rest", "reflection", "planning", "reading", "mood"],
  healthcare: ["rest", "sleep", "mood", "food", "learning", "friends"],
  shift_worker: ["sleep", "rest", "money", "food", "mood", "friends"],
  creative: ["creativity", "music", "writing", "focus", "reading", "mood"],
  student: ["study", "focus", "sleep", "friends", "learning", "mood"],
  job_seeker: ["job-hunt", "interviews", "learning", "mood", "fitness", "money"],
  parent: ["kids", "caring", "family", "rest", "home", "mood"],
  athlete: ["fitness", "rest", "food", "sleep", "health", "focus"],
  wellbeing: ["sleep", "mood", "rest", "nature", "gratitude", "health"],
  retired: ["nature", "friends", "reading", "travel", "community", "health"],
  custom: ["mood", "sleep", "fitness", "family", "gratitude", "reflection"],
};

const GENERAL_INTERESTS = [
  "sleep",
  "fitness",
  "mood",
  "focus",
  "learning",
  "family",
  "friends",
  "money",
  "creativity",
  "gratitude",
  "reflection",
  "planning",
  "health",
  "food",
  "writing",
  "love",
  "rest",
  "nature",
  "reading",
  "music",
  "kids",
  "caring",
  "pets",
  "home",
  "travel",
  "faith",
  "community",
];

/** Up to `count` interest chips for a role, drawn only from tags Kata has questions for. */
export function interestChoices(role: RoleKey | null, known: readonly string[], count = 18): string[] {
  const ok = new Set(known);
  const order = [...(role ? ROLE_INTERESTS[role] : []), ...GENERAL_INTERESTS, ...known];
  return [...new Set(order)].filter((t) => ok.has(t)).slice(0, count);
}

/** "job-hunt" reads as "Job hunt". Custom interests are shown as typed. */
export function interestLabel(tag: string): string {
  const words = tag.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Interests are stored the way tags are: lowercase, no #, single spaces. */
export function normalizeInterest(raw: string): string {
  return raw.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 32);
}

/** A stable hue for an interest, so it keeps its colour everywhere it appears. */
export function interestHue(tag: string): number {
  let h = 0;
  for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 8;
}

export const CHECK_INS: { value: CheckIn; label: string; said: string; line: string }[] = [
  { value: "morning", label: "Morning", said: "Mornings, please.", line: "Checks in every morning" },
  { value: "evening", label: "Evening", said: "Evenings, please.", line: "Checks in every evening" },
  { value: "both", label: "Both", said: "Both, morning and evening.", line: "Checks in morning and evening" },
];

export function checkInInfo(value: CheckIn) {
  return CHECK_INS.find((c) => c.value === value) ?? CHECK_INS[0];
}

/** "a", "a and b", "a, b and c". */
export function joinWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// Handles: the same rule the server enforces (lib/social/handles.ts), checked as you type
// so most mistakes show before a request. Reserved and taken handles come from the server.
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;

export function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function handleProblem(handle: string): string | null {
  if (!handle) return null;
  if (!/^[a-z0-9_]*$/.test(handle)) return "Use only lowercase letters, numbers and underscores.";
  if (handle.length < HANDLE_MIN) return `Handles need at least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `Handles can be at most ${HANDLE_MAX} characters.`;
  return null;
}
