import { ROLE_PRESETS } from "@/lib/roles";
import type { RoleKey, TemplateField } from "@/lib/types";

/** Where a page in the gallery comes from. */
export type PageSource = "people" | "starter" | "draft";

/** A page as the gallery shows it: a published template, one of Kata's starters, or a draft. */
export interface GalleryPage {
  /** Unique on the page: the template id, `starter:<role>` or `draft:<n>`. */
  key: string;
  source: PageSource;
  /** The published template behind it, cloned when someone makes it theirs. */
  templateId: string | null;
  name: string;
  /** What the copy is called when someone uses it, before they rename it. */
  saveName: string;
  description: string;
  tags: string[];
  fields: TemplateField[];
  /** Real clones by other people. Starters and drafts have none. */
  cloneCount: number;
  hue: number;
  /** Role filters this page answers to. */
  roles: RoleKey[];
}

/** The writer's current page, for "Your page" marks. */
export interface ActivePage {
  name: string;
  clonedFrom: string | null;
  questions: number;
}

export type Filter = "all" | RoleKey | `tag:${string}`;

/** Filter by who you are. A page answers to a role through its tags. */
export const ROLE_FILTERS: { key: Exclude<RoleKey, "custom">; label: string; tags: string[] }[] = [
  { key: "developer", label: "Developers", tags: ["tech", "code", "coding", "developer", "engineering", "software", "shipping", "dev"] },
  { key: "designer", label: "Designers", tags: ["creative", "design", "designer", "art", "craft"] },
  { key: "founder", label: "Founders", tags: ["leadership", "startup", "founder", "founders", "business"] },
  { key: "job_seeker", label: "Job seekers", tags: ["career", "job-hunt", "job hunt", "jobs", "interviews"] },
  { key: "student", label: "Students", tags: ["study", "school", "student", "learning", "university", "thesis", "research"] },
  { key: "teacher", label: "Teachers", tags: ["teaching", "teacher", "education", "classroom"] },
  { key: "healthcare", label: "Healthcare", tags: ["healthcare", "nursing", "nurse", "shifts"] },
  { key: "creative", label: "Makers", tags: ["maker", "music", "art", "craft", "writing"] },
  { key: "parent", label: "Parents and carers", tags: ["family", "parenting", "kids", "caring"] },
  { key: "athlete", label: "Training", tags: ["fitness", "training", "running", "sport"] },
  { key: "wellbeing", label: "Wellbeing", tags: ["wellbeing", "self-care", "rest", "mood"] },
];

export const normTag = (t: string) => t.trim().toLowerCase().replace(/^#/, "");

export function rolesFor(tags: string[]): RoleKey[] {
  const set = new Set(tags.map(normTag));
  return ROLE_FILTERS.filter((r) => r.tags.some((t) => set.has(t))).map((r) => r.key);
}

/** A stable hue for a template, from its id (the same rule people's seals use). */
export function hueFromId(id: string) {
  const n = parseInt(id.slice(-2), 16);
  return Number.isFinite(n) ? n % 8 : 0;
}

const STARTER: Record<RoleKey, { name: string; hue: number; tags: string[] }> = {
  developer: { name: "Developer", hue: 2, tags: ["tech"] },
  designer: { name: "Designer", hue: 4, tags: ["creative"] },
  founder: { name: "Founder", hue: 0, tags: ["leadership"] },
  job_seeker: { name: "Job seeker", hue: 3, tags: ["career"] },
  freelancer: { name: "Freelancer", hue: 7, tags: ["freelance"] },
  teacher: { name: "Teacher", hue: 2, tags: ["teaching"] },
  healthcare: { name: "Healthcare", hue: 3, tags: ["healthcare"] },
  shift_worker: { name: "Shift work", hue: 6, tags: ["shifts"] },
  creative: { name: "Artist or maker", hue: 5, tags: ["maker"] },
  student: { name: "Student", hue: 6, tags: ["study"] },
  parent: { name: "Parent or carer", hue: 1, tags: ["family"] },
  athlete: { name: "Training", hue: 0, tags: ["fitness"] },
  wellbeing: { name: "Looking after myself", hue: 4, tags: ["wellbeing"] },
  retired: { name: "Retired", hue: 3, tags: ["life"] },
  custom: { name: "One question", hue: 1, tags: [] },
};

/** Kata's role starters (lib/roles.ts) as gallery pages, so the gallery is never empty. */
export function starterPages(): GalleryPage[] {
  return ROLE_PRESETS.map((preset) => {
    const s = STARTER[preset.key];
    return {
      key: `starter:${preset.key}`,
      source: "starter" as const,
      templateId: null,
      name: s.name,
      saveName: preset.key === "custom" ? "My page" : `${s.name} starter`,
      description: preset.description,
      tags: s.tags,
      fields: preset.fields.map((f, i) => ({ ...f, config: { ...f.config }, id: `${preset.key}-${i}`, order: i })),
      cloneCount: 0,
      hue: s.hue,
      roles: preset.key === "custom" ? [] : [preset.key],
    };
  });
}

export function matches(page: GalleryPage, filter: Filter) {
  if (filter === "all") return true;
  if (filter.startsWith("tag:")) return page.tags.map(normTag).includes(filter.slice(4));
  return page.roles.includes(filter as RoleKey);
}

export const isQuestion = (f: Pick<TemplateField, "type">) => f.type !== "divider";

export function questionCount(fields: Pick<TemplateField, "type">[]) {
  return fields.filter(isQuestion).length;
}

/** Drop section breaks left with nothing to divide: at either end, or two in a row. */
export function tidy(fields: TemplateField[]): TemplateField[] {
  const out: TemplateField[] = [];
  for (const f of fields) {
    if (f.type === "divider" && (out.length === 0 || out[out.length - 1].type === "divider")) continue;
    out.push(f);
  }
  while (out.length && out[out.length - 1].type === "divider") out.pop();
  return out.map((f, i) => ({ ...f, order: i }));
}

export function usedBy(n: number) {
  return n > 0 ? `Used by ${n.toLocaleString("en-US")}` : "New";
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
