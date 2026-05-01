import type { RolePreset } from "./types";

export const ROLE_PRESETS: RolePreset[] = [
  {
    key: "developer",
    name: "Developer",
    emoji: "</>",
    description: "Ship logs, blockers, and the plan for tomorrow.",
    fields: [
      {
        type: "long_text",
        label: "What did I ship today?",
        required: true,
        config: { placeholder: "PRs, commits, decisions, fixes…" },
      },
      {
        type: "long_text",
        label: "What's blocking me?",
        required: false,
        config: { placeholder: "Bugs, dependencies, ambiguity…" },
      },
      {
        type: "long_text",
        label: "What's my plan for tomorrow?",
        required: false,
        config: { placeholder: "Top 1-3 tasks…" },
      },
      {
        type: "tags",
        label: "Project",
        required: false,
        config: { freeForm: true },
      },
      {
        type: "energy",
        label: "Energy level",
        required: false,
        config: {},
      },
    ],
  },
  {
    key: "designer",
    name: "Designer",
    emoji: "✺",
    description: "Craft, feedback, and inspiration captured daily.",
    fields: [
      {
        type: "long_text",
        label: "What did I create?",
        required: true,
        config: { placeholder: "Wireframes, prototypes, explorations…" },
      },
      {
        type: "long_text",
        label: "What feedback did I receive?",
        required: false,
        config: { placeholder: "From reviews, users, teammates…" },
      },
      {
        type: "long_text",
        label: "What am I inspired by today?",
        required: false,
        config: { placeholder: "References, sites, sketches…" },
      },
      {
        type: "tags",
        label: "Tools used",
        required: false,
        config: { freeForm: true },
      },
      {
        type: "mood_slider",
        label: "Mood",
        required: false,
        config: { emojis: ["😞", "😕", "😐", "🙂", "😄"] },
      },
    ],
  },
  {
    key: "founder",
    name: "Founder / CEO",
    emoji: "▲",
    description: "Decisions, risks, conversations, deferrals.",
    fields: [
      {
        type: "long_text",
        label: "What decisions did I make?",
        required: true,
        config: { placeholder: "Hires, product, capital, strategy…" },
      },
      {
        type: "long_text",
        label: "What is the biggest risk right now?",
        required: false,
        config: {},
      },
      {
        type: "long_text",
        label: "Who did I talk to?",
        required: false,
        config: { placeholder: "Customers, investors, candidates…" },
      },
      {
        type: "long_text",
        label: "What did I defer?",
        required: false,
        config: {},
      },
      {
        type: "rating",
        label: "Confidence level",
        required: false,
        config: {},
      },
    ],
  },
  {
    key: "job_seeker",
    name: "Job Seeker",
    emoji: "✦",
    description: "Applications, responses, practice, and energy.",
    fields: [
      {
        type: "long_text",
        label: "What did I apply to today?",
        required: true,
        config: { placeholder: "Roles, companies, recruiters…" },
      },
      {
        type: "long_text",
        label: "Any responses?",
        required: false,
        config: {},
      },
      {
        type: "long_text",
        label: "What did I practice?",
        required: false,
        config: { placeholder: "Algorithms, system design, behavioural…" },
      },
      {
        type: "energy",
        label: "Energy level",
        required: false,
        config: {},
      },
      {
        type: "long_text",
        label: "Notes",
        required: false,
        config: {},
      },
    ],
  },
  {
    key: "student",
    name: "Student",
    emoji: "✎",
    description: "Study time, what confused you, what clicked.",
    fields: [
      {
        type: "long_text",
        label: "What did I study?",
        required: true,
        config: { placeholder: "Topics, chapters, problem sets…" },
      },
      {
        type: "long_text",
        label: "What confused me?",
        required: false,
        config: {},
      },
      {
        type: "long_text",
        label: "What clicked today?",
        required: false,
        config: {},
      },
      {
        type: "number",
        label: "Study duration",
        required: false,
        config: { unit: "hours", min: 0, max: 24 },
      },
      {
        type: "rating",
        label: "Confidence",
        required: false,
        config: {},
      },
    ],
  },
  {
    key: "custom",
    name: "Custom",
    emoji: "✦",
    description: "Build your own daily form, block by block.",
    fields: [
      {
        type: "long_text",
        label: "How was today?",
        required: true,
        config: { placeholder: "Write whatever feels right." },
      },
    ],
  },
];

export function presetByKey(key: string) {
  return ROLE_PRESETS.find((r) => r.key === key) ?? ROLE_PRESETS[0];
}
