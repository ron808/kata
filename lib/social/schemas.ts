import { z } from "zod";
import { MOMENT_KINDS, REACTION_KINDS, VISIBILITIES } from "@/lib/db/models/Moment";
import { isObjectId } from "./db";

/** Tags and interests are stored the way entry tags are: lowercase, without the #. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").toLowerCase();
}

const Tag = z.string().max(64).transform(normalizeTag).pipe(z.string().max(32));

const tagList = (max: number) =>
  z
    .array(Tag)
    .max(max)
    .transform((tags) => [...new Set(tags.filter(Boolean))]);

/** An optional query value; empty strings count as absent. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const optionalTag = optionalText(64).transform((v) => (v ? normalizeTag(v) || undefined : undefined));

const ObjectIdString = z.string().refine(isObjectId, "Invalid id");

export const ProfilePatchSchema = z.object({
  handle: z.string().max(64).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(160).optional(),
  isPublic: z.boolean().optional(),
  interests: tagList(12).optional(),
  role: z.string().trim().max(60).optional(),
});

export const HandleQuerySchema = z.object({ h: z.string().max(64).default("") });

export const PeopleQuerySchema = z.object({
  q: optionalText(40),
  role: optionalText(40),
  tag: optionalTag,
  suggested: z.enum(["1", "true"]).optional(),
});

export const FollowSchema = z.object({ handle: z.string().min(1).max(64) });

export const FeedQuerySchema = z.object({
  scope: z.enum(["following", "discover"]).default("following"),
  tag: optionalTag,
  before: optionalText(400),
});

export const MomentCreateSchema = z.object({
  text: z.string().trim().min(1).max(500),
  kind: z.enum(MOMENT_KINDS),
  tags: tagList(5).default([]),
  visibility: z.enum(VISIBILITIES).default("public"),
  threadTitle: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((v) => v || null),
  entryId: ObjectIdString.nullish(),
});

export const ReactionSchema = z.object({ kind: z.enum(REACTION_KINDS) });

export const ReplySchema = z.object({ text: z.string().trim().min(1).max(500) });

export const NotificationsPostSchema = z.object({ read: z.literal("all") });

/** A missing or malformed JSON body fails validation (400) rather than throwing a 500. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  return schema.parse(await request.json().catch(() => undefined));
}

export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.output<T> {
  return schema.parse(Object.fromEntries(new URL(request.url).searchParams));
}
