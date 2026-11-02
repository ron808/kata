import { NextResponse } from "next/server";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { contextFor } from "@/lib/companion/engine";
import { writeTake } from "@/lib/missions";

export const maxDuration = 30;

type Params = { params: Promise<{ missionId: string }> };

/** Maru's few sentences on a finished mission: written once, the first time the report is opened. */
export async function POST(_: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { missionId } = await params;
    const take = await writeTake(await contextFor(session.user.id), missionId);
    if (take === null) return jsonError("Not found", 404);
    return NextResponse.json({ take });
  } catch (err) {
    return handleError(err);
  }
}
