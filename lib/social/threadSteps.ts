import type { IThread } from "@/lib/db/models/Thread";
import { ThreadUpdate } from "@/lib/db/models/ThreadUpdate";

/*
 * Where a shared thread stands, put in its updates however it was set: its card, the Threads page,
 * a check-in, the conversation. Only the step goes, never the words that came with it, since a
 * thread's notes stay its writer's. A habit's Done is a step for its day, and taking the day back
 * takes the step back.
 */

export type Stepped = Pick<IThread, "_id" | "userId" | "kind" | "status" | "doneDays" | "with">;

export async function recordStep(before: Stepped, after: Pick<IThread, "kind" | "status" | "doneDays">): Promise<void> {
  if (!before.with?.length) return;
  const base = { threadId: before._id, ownerId: before.userId, by: before.userId, kind: "update" as const, text: "" };
  const steps: { status: IThread["status"]; day: string | null }[] = [];
  if (after.kind === "habit") {
    const was = new Set(before.doneDays ?? []);
    const kept = new Set(after.doneDays ?? []);
    for (const day of kept) if (!was.has(day)) steps.push({ status: "done", day });
    const undone = [...was].filter((d) => !kept.has(d));
    if (undone.length) await ThreadUpdate.deleteMany({ threadId: before._id, by: before.userId, text: "", status: "done", day: { $in: undone } });
  }
  // Done on a paused habit starts it again: the day says it.
  if (after.status !== before.status && !(after.status === "moving" && steps.length)) steps.unshift({ status: after.status, day: null });
  // Stamped when written, like everything else on it, so it sits in order among them.
  const at = Date.now();
  if (steps.length) await ThreadUpdate.insertMany(steps.map((s, i) => ({ ...base, ...s, createdAt: new Date(at + i) })));
}
