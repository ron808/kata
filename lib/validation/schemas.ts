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

export const TemplateFieldSchema = z.object({
  id: z.string().min(1),
  type: FieldTypeEnum,
  label: z.string().min(1).max(120),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
  config: z.record(z.string(), z.any()).default({}),
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
      "Job Seeker",
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

export const EntryFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export const EntryFieldSchema = z.object({
  fieldId: z.string(),
  type: FieldTypeEnum,
  label: z.string(),
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
