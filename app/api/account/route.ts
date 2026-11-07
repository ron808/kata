import { NextResponse } from "next/server";
import { z } from "zod";
import { accountCounts, deleteAccount, passwordMatches } from "@/lib/account";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";

const DeleteSchema = z.object({ password: z.string().min(1).max(200) });

/** How much is in the account: what the start-fresh and delete questions count. */
export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    return NextResponse.json(await accountCounts(session.user.id));
  } catch (err) {
    return handleError(err);
  }
}

/** Deletes the account and everything in it, once the password checks out. */
export async function DELETE(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.login, `account:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many tries. Wait a few minutes and try again.", 429);
    const { password } = DeleteSchema.parse(await request.json().catch(() => null));
    await connectDB();
    if (!(await passwordMatches(session.user.id, password))) return jsonError("That password isn’t right.", 400);
    await deleteAccount(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
