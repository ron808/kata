import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, requireUser } from "@/lib/api";
import { checkHandle } from "@/lib/social/handles";
import { HandleQuerySchema, parseQuery } from "@/lib/social/schemas";

/** Live availability while someone types a handle. */
export async function GET(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    const { h } = parseQuery(request, HandleQuerySchema);
    await connectDB();
    const check = await checkHandle(h, session.user.id);
    return NextResponse.json(check.ok ? { ok: true } : { ok: false, reason: check.reason });
  } catch (err) {
    return handleError(err);
  }
}
