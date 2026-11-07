import { NextResponse } from "next/server";
import { z } from "zod";
import { FRESH_PARTS, passwordMatches, startFresh } from "@/lib/account";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";

const FreshSchema = z.object({
  password: z.string().min(1).max(200),
  parts: z.array(z.enum(FRESH_PARTS)).min(1).max(FRESH_PARTS.length),
  setup: z.boolean().default(false),
});

/** Clears the parts they picked and keeps the account, once the password checks out. */
export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.login, `account:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many tries. Wait a few minutes and try again.", 429);
    const { password, parts, setup } = FreshSchema.parse(await request.json().catch(() => null));
    await connectDB();
    if (!(await passwordMatches(session.user.id, password))) return jsonError("That password isn’t right.", 400);
    await startFresh(session.user.id, [...new Set(parts)], setup);
    return NextResponse.json({ ok: true, setup });
  } catch (err) {
    return handleError(err);
  }
}
