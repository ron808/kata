import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { Thread, threadKey, type IThread } from "@/lib/db/models/Thread";
import { contextFor } from "@/lib/companion/engine";
import { companionError } from "@/lib/companion/http";
import { isDuplicateKey } from "@/lib/companion/messages";
import { valueText } from "@/lib/companion/fields";
import { ThreadPatchSchema } from "@/lib/companion/schemas";
import { capFirst } from "@/lib/companion/text";
import { habitDone, logItem, saveThread, toThreadT, touch, withFields, withLog, withValue } from "@/lib/companion/threads";
import { dayDiff, parseDueAt } from "@/lib/companion/time";

export async function PATCH(request: Request, ctx: { params: Promise<{ threadId: string }> }) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { threadId } = await ctx.params;
    if (!mongoose.isObjectIdOrHexString(threadId)) return jsonError("Not found", 404);
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);

    const data = ThreadPatchSchema.parse(await request.json().catch(() => null));
    const c = await contextFor(session.user.id);
    const t = await Thread.findOne({ _id: threadId, userId: c.userId }).lean<IThread>();
    if (!t) return jsonError("Not found", 404);

    const set: Partial<IThread> = {};
    if (data.title !== undefined) {
      const title = capFirst(data.title.replace(/\s+/g, " "));
      const key = threadKey(title);
      if (key !== t.key && (await Thread.exists({ userId: c.userId, key }))) {
        return jsonError("You already have a thread with that name.", 409);
      }
      set.title = title;
      set.key = key;
    }
    if (data.kind) set.kind = data.kind;
    if (data.tags) set.tags = Array.from(new Set(data.tags.map((tag) => tag.toLowerCase())));
    if (data.nextStep !== undefined) set.nextStep = data.nextStep;
    if (data.dueAt !== undefined) set.dueAt = data.dueAt === null ? null : parseDueAt(data.dueAt, c.tz);
    if (data.shared !== undefined) set.shared = data.shared;
    if (data.archived !== undefined) set.archived = data.archived;

    const statusChanged = data.status !== undefined && data.status !== t.status;
    if (statusChanged) {
      set.status = data.status;
      if (data.status === "done" && data.nextStep === undefined) set.nextStep = "";
      if (!data.note) set.lastNote = "";
    }
    if (data.note) set.lastNote = data.note;
    if (statusChanged || data.note) {
      set.log = withLog(t.log, logItem(data.note ?? "", statusChanged ? (data.status ?? null) : null, "you", c.now));
      // A habit's lastTouchedAt is the last day it was done, so an edit doesn't count.
      if (t.kind !== "habit") Object.assign(set, touch(t, c));
    }

    // What it keeps a value on, and the values for a day.
    if (data.track || data.untrack) {
      const specs = (data.track ?? []).map((f) => ({ label: capFirst(f.label), type: f.type ?? "number", unit: f.unit ?? "", goal: f.goal ?? null }));
      set.fields = withFields(t.fields ?? [], specs, data.untrack ?? []);
    }
    if (data.values) {
      const day = data.day && dayDiff(c.day, data.day) >= 0 && dayDiff(c.day, data.day) <= 30 ? data.day : c.day;
      let fields = set.fields ?? t.fields ?? [];
      const logged: string[] = [];
      for (const [key, raw] of Object.entries(data.values)) {
        const f = fields.find((x) => x.key === key);
        if (!f) continue;
        const value = raw === null || raw === "" ? null : f.type === "number" ? Number(raw) : String(raw);
        if (typeof value === "number" && !Number.isFinite(value)) return jsonError(`${f.label} needs a number.`, 400);
        fields = fields.map((x) => (x.key === key ? withValue(x, value, day, c.now) : x));
        if (value !== null) logged.push(valueText(f, value));
      }
      set.fields = fields;
      if (logged.length) {
        // Logging a habit today counts it as done. The numbers keep their own history, not the log.
        const done = t.kind === "habit" && day === c.day ? habitDone(t, c) : null;
        if (done) Object.assign(set, done);
        else if (t.kind !== "habit") Object.assign(set, touch(t, c));
      }
    }

    let thread: IThread | null = t;
    try {
      if (Object.keys(set).length) thread = await saveThread(c, t._id, set);
    } catch (err) {
      if (isDuplicateKey(err)) return jsonError("You already have a thread with that name.", 409);
      throw err;
    }
    if (!thread) return jsonError("Not found", 404);
    return NextResponse.json({ thread: toThreadT(thread, c) });
  } catch (err) {
    return companionError(err);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ threadId: string }> }) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { threadId } = await ctx.params;
    if (!mongoose.isObjectIdOrHexString(threadId)) return jsonError("Not found", 404);
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);

    const c = await contextFor(session.user.id);
    const res = await Thread.deleteOne({ _id: threadId, userId: c.userId });
    if (!res.deletedCount) return jsonError("Not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return companionError(err);
  }
}
