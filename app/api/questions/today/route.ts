import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { companionError } from "@/lib/companion/http";
import { contextFor } from "@/lib/companion/engine";
import { pageState, questionsFor } from "@/lib/companion/load";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const ctx = await contextFor(session.user.id);
    const { day } = await pageState(ctx);
    return NextResponse.json(await questionsFor(ctx, day !== ctx.day));
  } catch (err) {
    return companionError(err);
  }
}
