export type FieldType =
  | "short_text"
  | "long_text"
  | "mood_slider"
  | "energy"
  | "number"
  | "tags"
  | "yes_no"
  | "rating"
  | "link"
  | "divider";

export type FieldValue = string | number | boolean | string[] | null;

export interface FieldConfig {
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  unit?: string;
  min?: number;
  max?: number;
  emojis?: string[]; // for mood_slider
  yesLabel?: string;
  noLabel?: string;
  allowedTags?: string[];
  freeForm?: boolean;
  sectionLabel?: string;
}

export interface TemplateField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  order: number;
  config: FieldConfig;
}

export interface Template {
  _id?: string;
  userId?: string;
  name: string;
  description: string;
  isPublished: boolean;
  publishedSlug: string | null;
  cloneCount: number;
  clonedFrom: string | null;
  tags: string[];
  fields: TemplateField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EntryField {
  fieldId: string;
  type: FieldType;
  label: string;
  value: FieldValue;
}

export interface Entry {
  _id?: string;
  userId?: string;
  templateId?: string;
  date: string; // ISO yyyy-mm-dd at midnight UTC
  fields: EntryField[];
  wordCount: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type RoleKey =
  | "developer"
  | "designer"
  | "founder"
  | "job_seeker"
  | "student"
  | "custom";

export interface RolePreset {
  key: RoleKey;
  name: string;
  emoji: string;
  description: string;
  fields: Omit<TemplateField, "id" | "order">[];
}

export interface DigestSummary {
  _id: string;
  type: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  content: string;
  entryCount: number;
  wordCount: number;
  isRead: boolean;
  createdAt: string;
}

export interface UserStats {
  streak: number;
  longestStreak: number;
  totalEntries: number;
  totalWords: number;
  averageWords: number;
  contributions: { date: string; wordCount: number }[];
}
