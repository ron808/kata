import { NextResponse } from "next/server";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { contextFor, type EngineCtx } from "@/lib/companion/engine";
import { momentOn } from "@/lib/companion/time";
import { Mission } from "@/lib/db/models/Mission";
import { User } from "@/lib/db/models/User";
import { Finished, NoSuchTask, type Change } from "@/lib/missions/apply";
import { changeMission, endMission, focusOff, focusOn, getMission, keepAsThreads, runAgain, toMissionT } from "@/lib/missions";
import { endsFrom, parseTasks } from "@/lib/missions/parse";
import { MissionChangeSchema, type MissionChange } from "@/lib/missions/schemas";

type Params = { params: Promise<{ missionId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { missionId } = await params;
    const ctx = await contextFor(session.user.id);
    const mission = await getMission(ctx, missionId);
    if (!mission) return jsonError("Not found", 404);
    return NextResponse.json({ mission: toMissionT(mission, ctx) });
  } catch (err) {
    return handleError(err);
  }
}

/** What the page sent, in the terms the mission works in: clock times become moments. */
async function changeFrom(ctx: EngineCtx, id: string, data: MissionChange): Promise<Change | null> {
  const m = await getMission(ctx, id);
  if (!m) return null;
  const day = m.day > ctx.day ? m.day : ctx.day;
  const when = { day, now: ctx.now, tz: ctx.tz };
  switch (data.do) {
    case "add":
      return { do: "add", tasks: parseTasks(data.tasks, when) };
    case "edit": {
      const [hour, minute] = data.at ? data.at.split(":").map(Number) : [];
      const at = data.at === undefined ? undefined : data.at === null ? null : momentOn(day, hour, minute, ctx.tz);
      return { do: "edit", task: data.task, title: data.title, at, minutes: data.minutes };
    }
    case "ends": {
      if (data.more) {
        const from = Math.max(m.endsAt ? new Date(m.endsAt).getTime() : 0, ctx.now.getTime());
        return { do: "ends", endsAt: new Date(from + data.more * 60_000) };
      }
      return { do: "ends", endsAt: data.until ? endsFrom(data.until, when) : null };
    }
    case "carry":
      return { do: "carry", day: ctx.day };
    case "again":
    case "keep":
      return null;
    default:
      return data;
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { missionId } = await params;
    const data = MissionChangeSchema.parse(await request.json().catch(() => null));
    const ctx = await contextFor(session.user.id);

    if (data.do === "again") {
      const made = await runAgain(ctx, missionId);
      return made ? NextResponse.json({ mission: toMissionT(made, ctx) }, { status: 201 }) : jsonError("Not found", 404);
    }
    if (data.do === "keep") return NextResponse.json({ kept: await keepAsThreads(ctx, missionId) });

    const change = await changeFrom(ctx, missionId, data);
    if (!change) return jsonError("Not found", 404);
    const saved =
      change.do === "focus"
        ? await focusOn(ctx, missionId)
        : change.do === "unfocus"
          ? await focusOff(ctx)
          : change.do === "finish" || change.do === "drop"
            ? await endMission(ctx, missionId, change.do)
            : await changeMission(ctx, missionId, change);
    if (!saved) return jsonError("That didn’t save. Try again.", 409);
    return NextResponse.json({ mission: toMissionT(saved, ctx) });
  } catch (err) {
    if (err instanceof NoSuchTask) return jsonError("That task isn’t on this list any more.", 404);
    if (err instanceof Finished) return jsonError("This mission has ended.", 409);
    return handleError(err);
  }
}

/** Gone for good: only ever from a finished mission, on the writer's say-so. */
export async function DELETE(_: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { missionId } = await params;
    const ctx = await contextFor(session.user.id);
    const m = await getMission(ctx, missionId);
    if (!m) return jsonError("Not found", 404);
    await Mission.deleteOne({ _id: m._id, userId: ctx.userId });
    await User.updateOne({ _id: ctx.userId, focusMissionId: m._id }, { $set: { focusMissionId: null } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
