import { z } from "zod";

export const FieldTypeEnum = z.enum([
  "short_text",
  "long_text",
  "mood_slider",
  "energy",
  "number",
  "tags",
  "yes_no",
  "rating",
  "link",
  "divider",
]);

// Every string and list a writer can store has a size, so one account can't fill the database.
const finite = z.number().finite();

/** FieldConfig (lib/types.ts), and nothing else: keys it doesn't know are dropped. */
export const FieldConfigSchema = z.object({
  placeholder: z.string().max(200).optional(),
  maxLength: finite.optional(),
  minLength: finite.optional(),
  unit: z.string().max(30).optional(),
  min: finite.optional(),
  max: finite.optional(),
  emojis: z.array(z.string().max(16)).max(10).optional(),
  yesLabel: z.string().max(40).optional(),
  noLabel: z.string().max(40).optional(),
  allowedTags: z.array(z.string().max(40)).max(50).optional(),
  freeForm: z.boolean().optional(),
  sectionLabel: z.string().max(120).optional(),
});

export const TemplateFieldSchema = z.object({
  id: z.string().min(1).max(64),
  type: FieldTypeEnum,
  label: z.string().min(1).max(120),
  required: z.boolean().default(false),
  order: z.number().int().min(0).max(100),
  config: FieldConfigSchema.default({}),
});

export const TemplateUpsertSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).default(""),
  tags: z.array(z.string().max(40)).max(8).default([]),
  fields: z.array(TemplateFieldSchema).min(1).max(20),
});

export const RegisterSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(120),
  role: z
    .enum([
      "Developer",
      "Designer",
      "Founder",
      "Job seeker",
      "Student",
      "Custom",
    ])
    .default("Custom"),
  timezone: z.string().min(1).max(60).default("UTC"),
});

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(120),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(120),
  newPassword: z.string().min(8).max(120),
});

/** Room for a page's 5,000 words in one answer, and no more. */
export const ANSWER_MAX = 40_000;

export const EntryFieldValueSchema = z.union([
  z.string().max(ANSWER_MAX),
  finite,
  z.boolean(),
  z.array(z.string().max(100)).max(50),
  z.null(),
]);

export const EntryFieldSchema = z.object({
  fieldId: z.string().max(80),
  type: FieldTypeEnum,
  label: z.string().max(300),
  value: EntryFieldValueSchema,
});

const IsoDateString = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: "Invalid date",
  });

export const EntryUpsertSchema = z.object({
  fields: z.array(EntryFieldSchema).max(20),
  date: IsoDateString.optional(), // ISO yyyy-mm-dd or full ISO 8601; defaults to today
});

export const EntriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tag: z.string().optional(),
  startDate: IsoDateString.optional(),
  endDate: IsoDateString.optional(),
});
