import { ROLE_PRESETS } from "@/lib/roles";
import type { DailyQuestion, RoleKey, ThreadStatus, ThreadT } from "@/lib/types";
import { dateToDay, dayDiff, localDay, validTimeZone } from "@/lib/companion/time";
import { pick, ref, seedOf, slugify } from "@/lib/companion/text";
import { QUESTION_BANK, type BankQuestion, type QuestionTag } from "./bank";

/**
 * Up to three questions for today's page. The page saves an answer as a
 * long_text field with fieldId `kata:<tag>:<id>`, which files the page under
 * that tag. Pure, so the client can import kataFieldId too.
 */

export const MAX_PAGE_QUESTIONS = 3;

const FIELD_ID = /^kata:([a-z0-9][a-z0-9-]{0,39}):([a-z0-9][a-z0-9-]{0,79})$/;

export function kataFieldId(q: Pick<DailyQuestion, "id" | "tag">): string {
  return `kata:${q.tag}:${q.id}`;
}

export function isKataFieldId(fieldId: string): boolean {
  return FIELD_ID.test(fieldId);
}

export function parseKataFieldId(fieldId: string): { tag: string; questionId: string; threadId: string | null } | null {
  const m = FIELD_ID.exec(fieldId);
  if (!m) return null;
  const thread = /-([0-9a-f]{24})$/.exec(m[2]);
  return { tag: m[1], questionId: m[2], threadId: thread ? thread[1] : null };
}

/** The role key behind a stored display name: "Founder / CEO" and "Founder" are both founder. */
export function roleKeyOf(role: string): RoleKey {
  const r = role.trim().toLowerCase();
  const preset = ROLE_PRESETS.find((p) => {
    const name = p.name.toLowerCase();
    return name === r || p.key === r.replace(/\s+/g, "_") || name.split(/\s*\/\s*/)[0] === r;
  });
  return preset?.key ?? "custom";
}

const SYNONYMS: Record<string, QuestionTag> = {
  running: "fitness", gym: "fitness", exercise: "fitness", workout: "fitness", workouts: "fitness",
  training: "fitness", sport: "fitness", sports: "fitness", yoga: "fitness", climbing: "fitness",
  nutrition: "food", cooking: "food", eating: "food", diet: "food",
  jobs: "job-hunt", "job-search": "job-hunt", career: "job-hunt", "job-hunting": "job-hunt",
  coding: "developer", programming: "developer", code: "developer", engineering: "developer",
  art: "creativity", drawing: "creativity", painting: "creativity", photography: "creativity",
  guitar: "music", piano: "music", singing: "music", songs: "music", band: "music", choir: "music",
  relationships: "love", relationship: "love", partner: "love", dating: "love", marriage: "love",
  finance: "money", finances: "money", budget: "money", budgeting: "money", saving: "money", investing: "money",
  productivity: "focus", "deep-work": "focus", attention: "focus",
  "mental-health": "mood", wellbeing: "mood", "well-being": "mood", stress: "mood", anxiety: "mood", emotions: "mood",
  books: "reading", book: "reading", novels: "reading", languages: "learning",
  school: "study", university: "study", college: "study", exams: "study", studying: "study",
  startup: "founder", startups: "founder", business: "founder",
  parenting: "kids", children: "kids", child: "kids", kid: "kids", baby: "kids", toddler: "kids",
  dog: "pets", dogs: "pets", cat: "pets", cats: "pets", pet: "pets",
  garden: "nature", gardening: "nature", hiking: "nature", outdoors: "nature", plants: "nature",
  church: "faith", prayer: "faith", praying: "faith", spirituality: "faith", religion: "faith", mosque: "faith", temple: "faith",
  trip: "travel", trips: "travel", holiday: "travel", holidays: "travel", vacation: "travel", travelling: "travel", traveling: "travel",
  relaxing: "rest", relax: "rest", breaks: "rest", "days-off": "rest",
  caregiving: "caring", carer: "caring", "looking-after": "caring",
  volunteering: "community", volunteer: "community", neighbours: "community", neighbors: "community",
  house: "home", chores: "home", cleaning: "home", housework: "home",
  "side-projects": "shipping", "side-project": "shipping", building: "shipping", making: "creativity",
  journaling: "reflection", meditation: "reflection", mindfulness: "reflection",
  friendship: "friends", interview: "interviews", "interview-prep": "interviews",
};

const TAGS = new Set<string>(QUESTION_BANK.flatMap((q) => q.tags));

/** The bank tags a writer's interests point at. */
export function interestTags(interests: string[]): QuestionTag[] {
  const out = new Set<QuestionTag>();
  for (const interest of interests) {
    const slug = slugify(interest);
    if (TAGS.has(slug)) out.add(slug as QuestionTag);
    else if (SYNONYMS[slug]) out.add(SYNONYMS[slug]);
  }
  return [...out];
}

/** The status a thread had when the day began, so answering a check-in doesn't reshuffle the page. */
function statusAtStart(t: ThreadT, day: string, timeZone: string): ThreadStatus {
  let status: ThreadStatus | null = null;
  for (const item of t.log) {
    if (localDay(timeZone, new Date(item.at)) >= day) break;
    if (item.status) status = item.status;
  }
  return status ?? t.status;
}

function lastTouchBefore(t: ThreadT, day: string, timeZone: string): number {
  let at = 0;
  for (const item of t.log) {
    const ms = new Date(item.at).getTime();
    if (localDay(timeZone, new Date(ms)) < day) at = Math.max(at, ms);
  }
  return at;
}

function rankThreads(threads: ThreadT[], day: string, timeZone: string): ThreadT[] {
  const ranked = threads.flatMap((t) => {
    const status = statusAtStart(t, day, timeZone);
    if (status === "done" || status === "paused") return [];
    const due = t.dueAt ? dayDiff(dateToDay(new Date(t.dueAt)), day) : null;
    let rank = 4;
    if (status === "stuck") rank = 0;
    else if (status === "waiting") rank = 1;
    else if (t.kind === "event" && due !== null && due >= 0 && due <= 3) rank = 2;
    else if (t.nextStep) rank = 3;
    const first = t.log[0]?.at ?? t.lastTouchedAt;
    if (localDay(timeZone, new Date(first)) >= day) rank += 10;
    return [{ t, rank, at: lastTouchBefore(t, day, timeZone) }];
  });
  ranked.sort((a, b) => a.rank - b.rank || b.at - a.at || a.t._id.localeCompare(b.t._id));
  return ranked.map((r) => r.t);
}

function fits(q: BankQuestion, when: "morning" | "evening" | null): boolean {
  return q.when === "any" || when === null || q.when === when;
}

export interface QuestionUser {
  _id: unknown;
  role: string;
  interests: string[];
  checkIn: "morning" | "evening" | "both";
  timezone: string;
}

export function questionsForToday(user: QuestionUser, threads: ThreadT[], day: string): DailyQuestion[] {
  const timeZone = validTimeZone(user.timezone);
  const userId = String(user._id);
  const when = user.checkIn === "both" ? null : user.checkIn;
  const used = new Set<string>();
  const out: DailyQuestion[] = [];

  for (const t of rankThreads(threads, day, timeZone).slice(0, 2)) {
    const status = statusAtStart(t, day, timeZone);
    const pool = QUESTION_BANK.filter(
      (q) =>
        q.text.includes("{thread}") &&
        q.kinds?.includes(t.kind) &&
        (!q.status || q.status.includes(status)) &&
        fits(q, when) &&
        !used.has(q.id)
    );
    // A stuck or waiting thread gets a question about that; anything else gets one about moving it on.
    const preferred = pool.filter((q) => (status === "stuck" || status === "waiting" ? Boolean(q.status) : !q.tags.includes("blockers")));
    const choices = preferred.length ? preferred : pool;
    if (!choices.length) continue;
    const q = pick(choices, seedOf(userId, day, t._id));
    used.add(q.id);
    out.push({
      id: `${q.id}-${t._id}`,
      text: q.text.replace("{thread}", ref(t)),
      tag: slugify(t.tags[0] ?? t.title) || "thread",
      threadId: t._id,
    });
  }

  const role = roleKeyOf(user.role);
  const interests = interestTags(user.interests);
  const general = (tags: string[]) =>
    QUESTION_BANK.filter(
      (q) => !q.text.includes("{thread}") && fits(q, when) && !used.has(q.id) && q.tags.some((tag) => tags.includes(tag))
    );
  let pool = general(interests);
  let tags: string[] = interests;
  if (!pool.length) {
    pool = general([role]);
    tags = [role];
  }
  if (!pool.length) {
    pool = general(["reflection", "planning"]);
    tags = ["reflection", "planning"];
  }
  if (pool.length) {
    const q = pick(pool, seedOf(userId, day, "general"));
    out.push({
      id: q.id,
      text: q.text,
      tag: slugify(q.tags.find((tag) => tags.includes(tag)) ?? q.tags[0]),
      threadId: null,
    });
  }
  return out.slice(0, MAX_PAGE_QUESTIONS);
}
