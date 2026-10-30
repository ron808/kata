import { NextResponse } from "next/server";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { loadProfile } from "@/lib/social/load";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { handle } = await ctx.params;

    const profile = await loadProfile(session.user.id, handle);
    if (!profile) return jsonError("Not found", 404);
    return NextResponse.json(profile);
  } catch (err) {
    return handleError(err);
  }
}
