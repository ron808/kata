import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { Thread, threadKey, type IThread } from "@/lib/db/models/Thread";
import { contextFor } from "@/lib/companion/engine";
import { companionError } from "@/lib/companion/http";
import { guessKind } from "@/lib/companion/extract";
import { ThreadCreateSchema } from "@/lib/companion/schemas";
import { createThread, listThreads, nextHue, saveThread, toThreadT } from "@/lib/companion/threads";
import { capFirst } from "@/lib/companion/text";
import { parseDueAt } from "@/lib/companion/time";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const ctx = await contextFor(session.user.id);
    return NextResponse.json({ threads: await listThreads(ctx, 100) });
  } catch (err) {
    return companionError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);

    const data = ThreadCreateSchema.parse(await request.json().catch(() => null));
    const ctx = await contextFor(session.user.id);
    const title = capFirst(data.title.replace(/\s+/g, " "));
    const tags = data.tags ? Array.from(new Set(data.tags.map((t) => t.toLowerCase()))) : undefined;
    const dueAt = typeof data.dueAt === "string" ? parseDueAt(data.dueAt, ctx.tz) : data.dueAt;

    const find = () => Thread.findOne({ userId: ctx.userId, key: threadKey(title) }).lean<IThread>();
    let existing = await find();
    if (!existing) {
      const created = await createThread(
        ctx,
        {
          title,
          kind: data.kind ?? guessKind(title),
          tags,
          nextStep: data.nextStep,
          dueAt,
          shared: data.shared,
          source: "manual",
          said: title,
          from: "you",
        },
        await nextHue(ctx.userId)
      );
      if (created) return NextResponse.json({ thread: toThreadT(created, ctx), created: true }, { status: 201 });
      existing = await find();
      if (!existing) return jsonError("Could not save that thread.", 409);
    }

    // Already tracked: bring it back if archived and apply what was sent.
    const set: Partial<IThread> = { archived: false };
    if (data.kind) set.kind = data.kind;
    if (tags) set.tags = tags;
    if (data.nextStep !== undefined) set.nextStep = data.nextStep;
    if (dueAt !== undefined) set.dueAt = dueAt;
    if (data.shared !== undefined) set.shared = data.shared;
    const thread = (await saveThread(ctx, existing._id, set)) ?? existing;
    return NextResponse.json({ thread: toThreadT(thread, ctx), created: false });
  } catch (err) {
    return companionError(err);
  }
}
