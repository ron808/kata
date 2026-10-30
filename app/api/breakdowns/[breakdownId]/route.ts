import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteBreakdown, keepBreakdown } from "@/lib/breakdowns";
import { contextFor } from "@/lib/companion/engine";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, jsonError, requireUser } from "@/lib/api";

const KeepSchema = z.object({ keep: z.boolean() });

type Params = { params: Promise<{ breakdownId: string }> };

/** Keeps an asked breakdown, or lets it go in thirty days. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { breakdownId } = await params;
    const { keep } = KeepSchema.parse(await request.json());
    const ctx = await contextFor(session.user.id);
    const breakdown = await keepBreakdown(ctx, breakdownId, keep);
    if (!breakdown) return jsonError("Not found", 404);
    return NextResponse.json({ breakdown });
  } catch (err) {
    return handleError(err);
  }
}

/** Deletes an asked breakdown. Weekly ones stay. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { breakdownId } = await params;
    await connectDB();
    if (!(await deleteBreakdown(session.user.id, breakdownId))) return jsonError("Not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
