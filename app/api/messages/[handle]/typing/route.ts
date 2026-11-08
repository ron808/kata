import { NextResponse } from "next/server";
import { z } from "zod";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { setTyping } from "@/lib/social/messages";

type Ctx = { params: Promise<{ handle: string }> };

const TypingSchema = z.object({ typing: z.boolean() });

/** They're typing to this person, or stopped: sent every few seconds at most while they type. */
export async function POST(request: Request, ctx: Ctx) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Slow down a little.", 429);
    const { handle } = await ctx.params;
    const { typing } = TypingSchema.parse(await request.json().catch(() => null));
    await connectDB();
    if (!(await setTyping(session.user.id, handle, typing))) return jsonError("Not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
