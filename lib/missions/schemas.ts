import { z } from "zod";

const taskText = z.string().trim().min(1).max(160);
const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const taskId = z.string().min(1).max(20);
const minutes = z.number().int().min(1).max(1440);

export const NewMissionSchema = z.object({
  title: z.string().trim().max(80).optional(),
  /** Each in their words: "Gym at 6pm for 45 min". */
  tasks: z.array(taskText).max(30).default([]),
  /** "2 hours", "18:00", a date. */
  until: z.string().trim().max(40).optional(),
  focus: z.boolean().optional(),
});

export const MissionChangeSchema = z.discriminatedUnion("do", [
  z.object({ do: z.literal("start"), task: taskId }),
  z.object({ do: z.literal("pause") }),
  z.object({ do: z.literal("done"), task: taskId, note: z.string().trim().max(200).optional() }),
  z.object({ do: z.literal("skip"), task: taskId }),
  z.object({ do: z.literal("back"), task: taskId }),
  z.object({ do: z.literal("stuck"), task: taskId, note: z.string().trim().max(200).optional() }),
  z.object({ do: z.literal("note"), task: taskId, note: z.string().trim().min(1).max(200) }),
  z.object({ do: z.literal("still") }),
  z.object({ do: z.literal("add"), tasks: z.array(taskText).min(1).max(10) }),
  z.object({ do: z.literal("edit"), task: taskId, title: z.string().trim().min(1).max(120).optional(), at: clockTime.nullable().optional(), minutes: minutes.nullable().optional() }),
  z.object({ do: z.literal("more"), task: taskId, minutes }),
  z.object({ do: z.literal("remove"), task: taskId }),
  z.object({ do: z.literal("rename"), title: z.string().trim().max(80) }),
  z.object({ do: z.literal("ends"), until: z.string().trim().max(40).nullable(), more: minutes.optional() }),
  z.object({ do: z.literal("focus") }),
  z.object({ do: z.literal("unfocus") }),
  z.object({ do: z.literal("finish") }),
  z.object({ do: z.literal("drop") }),
  z.object({ do: z.literal("reopen") }),
  z.object({ do: z.literal("carry") }),
  z.object({ do: z.literal("again") }),
  z.object({ do: z.literal("keep") }),
]);

export type MissionChange = z.infer<typeof MissionChangeSchema>;
