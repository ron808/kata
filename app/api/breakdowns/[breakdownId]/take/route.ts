import { NextResponse } from "next/server";
import { writeTake } from "@/lib/breakdowns";
import { contextFor } from "@/lib/companion/engine";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { handleError, jsonError, requireUser } from "@/lib/api";

export const maxDuration = 30;

/** Maru's few sentences on a breakdown, written the first time it's opened and kept. */
export async function POST(_request: Request, { params }: { params: Promise<{ breakdownId: string }> }) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.breakdown, `take:${session.user.id}`);
    if (!limit.ok) return jsonError("Try again a little later.", 429);
    const { breakdownId } = await params;
    const ctx = await contextFor(session.user.id);
    const take = await writeTake(ctx, breakdownId).catch((err) => {
      console.error("breakdowns:take", err);
      return "";
    });
    if (take === null) return jsonError("Not found", 404);
    if (!take) return jsonError(`${ctx.companion} couldn’t write about this just now.`, 503);
    return NextResponse.json({ take });
  } catch (err) {
    return handleError(err);
  }
}
