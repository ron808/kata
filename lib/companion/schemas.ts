import { z } from "zod";
import { THREAD_FIELD_TYPES, THREAD_KINDS, THREAD_STATUSES } from "@/lib/db/models/Thread";
import { CHECK_INS } from "@/lib/db/models/User";
import {
  EntryFieldSchema,
  EntryUpsertSchema,
  FieldTypeEnum,
  TemplateFieldSchema,
} from "@/lib/validation/schemas";
import { isKataFieldId, MAX_PAGE_QUESTIONS } from "@/lib/questions/daily";
import { ROLE_KEYS } from "@/lib/types";
import { COMPANION_NAME_MAX, NICKNAME_MAX } from "./name";

const DueAt = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), { message: "Invalid date" });

const Tags = z.array(z.string().trim().min(1).max(40)).max(8);

/** `where` is the page the writer is on, so Maru knows what "this" is. */
const Where = z.string().max(200).optional();
const Id = z.string().regex(/^[a-f0-9]{24}$/i);

export const CompanionPostSchema = z.union([
  z.object({
    messageId: z.string().min(1).max(40),
    value: z.string().min(1).max(40),
    where: Where,
    /** The writer's own words for a choice that takes them (a reply, a moment). */
    edit: z.string().trim().min(1).max(500).optional(),
    /** What they filled in on a choice's form, by input. */
    inputs: z
      .record(z.string().max(60), z.string().max(300))
      .refine((r) => Object.keys(r).length <= 8, { message: "Too many inputs" })
      .optional(),
    /** A tapped answer is said like typed words, so it carries the screen too. */
    screen: z.array(Id).max(8).optional(),
    here: Id.optional(),
    focus: Id.optional(),
  }),
  z.object({
    text: z.string().trim().min(1).max(1000),
    where: Where,
    /** The posts in view, in screen order. The server decides whether this turn is about them. */
    screen: z.array(Id).max(8).optional(),
    /** The one they're on. */
    here: Id.optional(),
    /** The post they asked from. */
    focus: Id.optional(),
  }),
]);

/** What the writer calls their companion, and what it calls them. Empty brings back the default. */
export const NamesSchema = z.object({
  companionName: z.string().max(COMPANION_NAME_MAX).optional(),
  nickname: z.string().max(NICKNAME_MAX).optional(),
});

export const ThreadCreateSchema = z.object({
  title: z.string().trim().min(1).max(60),
  kind: z.enum(THREAD_KINDS).optional(),
  tags: Tags.optional(),
  nextStep: z.string().trim().max(140).optional(),
  dueAt: DueAt.nullable().optional(),
  shared: z.boolean().optional(),
});

export const ThreadPatchSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  kind: z.enum(THREAD_KINDS).optional(),
  status: z.enum(THREAD_STATUSES).optional(),
  nextStep: z.string().trim().max(140).optional(),
  tags: Tags.optional(),
  dueAt: DueAt.nullable().optional(),
  shared: z.boolean().optional(),
  archived: z.boolean().optional(),
  note: z.string().trim().min(1).max(280).optional(),
  /** What it keeps a value on: added, or changed by name. */
  track: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(30),
        unit: z.string().trim().max(12).optional(),
        type: z.enum(THREAD_FIELD_TYPES).optional(),
        goal: z.number().positive().max(1e7).nullable().optional(),
      })
    )
    .max(4)
    .optional(),
  /** Keys to stop keeping. */
  untrack: z.array(z.string().max(40)).max(4).optional(),
  /** Values for a day by field key (null clears it): today, or `day`. */
  values: z
    .record(z.string().max(40), z.union([z.number().finite().min(-1e7).max(1e7), z.string().trim().max(120), z.null()]))
    .refine((r) => Object.keys(r).length <= 4, { message: "Too many values" })
    .optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const OnboardingSchema = z.object({
  role: z.enum(ROLE_KEYS),
  focus: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  checkIn: z.enum(CHECK_INS),
  fields: z.array(TemplateFieldSchema).min(1).max(20).optional(),
  companionName: z.string().max(COMPANION_NAME_MAX).optional(),
  nickname: z.string().max(NICKNAME_MAX).optional(),
  companionHue: z.number().int().min(1).max(7).nullable().optional(),
});

export const SuggestSchema = z.object({
  description: z.string().trim().min(1).max(500),
});

/** Today's page: the template's fields plus up to three of Kata's questions. */
export const PageUpsertSchema = EntryUpsertSchema.extend({
  fields: z.array(EntryFieldSchema).max(20 + MAX_PAGE_QUESTIONS),
  /** Sent by the writer's own save (not autosave): Kata reads the page with its model now. */
  final: z.boolean().optional(),
}).refine(
  (d) => {
    const kata = d.fields.filter((f) => isKataFieldId(f.fieldId)).length;
    return kata <= MAX_PAGE_QUESTIONS && d.fields.length - kata <= 20;
  },
  { message: "Too many fields", path: ["fields"] }
);

// ── What Groq may return ─────────────────────────────────────────────────────

export const GroqThreadsSchema = z.object({
  threads: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(60),
        kind: z.enum(THREAD_KINDS).catch("other"),
        status: z.enum(THREAD_STATUSES).nullable().catch(null),
        nextStep: z.string().max(140).catch(""),
        note: z.string().max(280).catch(""),
      })
    )
    .max(8),
});

export const GroqTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).catch(""),
  fields: z
    .array(
      z.object({
        type: FieldTypeEnum.exclude(["divider"]),
        label: z.string().trim().min(1).max(120),
        required: z.boolean().catch(false),
        config: z
          .object({
            placeholder: z.string().max(120).optional(),
            unit: z.string().max(20).optional(),
            min: z.number().optional(),
            max: z.number().optional(),
            yesLabel: z.string().max(20).optional(),
            noLabel: z.string().max(20).optional(),
            freeForm: z.boolean().optional(),
          })
          .catch({}),
      })
    )
    .min(1)
    .max(12),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
