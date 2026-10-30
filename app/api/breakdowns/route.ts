import { NextResponse } from "next/server";
import { z } from "zod";
import { askBreakdown, toBreakdownT } from "@/lib/breakdowns";
import { parsePeriod } from "@/lib/breakdowns/period";
import { contextFor } from "@/lib/companion/engine";
import { localDay } from "@/lib/companion/time";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { handleError, jsonError, requireUser } from "@/lib/api";

const MakeSchema = z.object({ period: z.string().trim().min(1).max(80) });

/** Breaks down a stretch the writer picked on the Breakdowns page: "last month", "since Oct 3". */
export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.breakdown, session.user.id);
    if (!limit.ok) return jsonError("That’s a lot of breakdowns for one hour. Try again a little later.", 429);
    const { period: said } = MakeSchema.parse(await request.json());
    const ctx = await contextFor(session.user.id);
    const period = parsePeriod(said, ctx.day, localDay(ctx.tz, new Date(ctx.user.createdAt)));
    if (!period) return jsonError(`Couldn’t tell which days “${said}” means. Try “last month”, “since Oct 3” or “Sep 1 to Sep 30”.`, 400);
    const made = await askBreakdown(ctx, period);
    return NextResponse.json({ breakdown: toBreakdownT(made) });
  } catch (err) {
    return handleError(err);
  }
}
