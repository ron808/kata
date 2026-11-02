import { NextResponse } from "next/server";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { contextFor } from "@/lib/companion/engine";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { createMission, focusOn, listMissions, toMissionT } from "@/lib/missions";
import { endsFrom, parseTasks } from "@/lib/missions/parse";
import { NewMissionSchema } from "@/lib/missions/schemas";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const ctx = await contextFor(session.user.id);
    const { open, past } = await listMissions(ctx);
    return NextResponse.json({ open: open.map((m) => toMissionT(m, ctx)), past: past.map((m) => toMissionT(m, ctx)) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);

    const data = NewMissionSchema.parse(await request.json().catch(() => null));
    const ctx = await contextFor(session.user.id);
    const when = { day: ctx.day, now: ctx.now, tz: ctx.tz };
    const made = await createMission(ctx, { title: data.title, tasks: parseTasks(data.tasks, when), endsAt: data.until ? endsFrom(data.until, when) : null });
    const mission = data.focus ? ((await focusOn(ctx, String(made._id))) ?? made) : made;
    return NextResponse.json({ mission: toMissionT(mission, ctx) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
