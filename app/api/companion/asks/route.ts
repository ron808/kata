import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { bringUpAsks, dropAsk, waitingAsks } from "@/lib/companion/asks";
import { ensureToday } from "@/lib/companion/engine";
import { companionError } from "@/lib/companion/http";
import { toKataMessage } from "@/lib/companion/messages";
import { connectDB } from "@/lib/db/mongoose";

/*
 * Things the writer asked to be asked about later (lib/companion/asks.ts). The app sets a timer
 * for the next one and calls POST when it's due, while they're here; nothing is sent anywhere
 * else. No model involved.
 */

/** What's waiting, soonest first, and when the next one comes up. */
export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    const asks = await waitingAsks(session.user.id);
    return NextResponse.json({ asks, next: asks[0]?.at ?? null });
  } catch (err) {
    return companionError(err);
  }
}

/** Brings up what's due as Maru's messages in today's conversation. */
export async function POST() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    // Today's conversation first, so its greeting stays the first thing in it.
    const { ctx } = await ensureToday(session.user.id);
    const { created, next } = await bringUpAsks(ctx);
    return NextResponse.json({ messages: created.map(toKataMessage), next: next?.toISOString() ?? null });
  } catch (err) {
    return companionError(err);
  }
}

/** Drops one before it comes up. */
export async function DELETE(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const { dropped, next } = await dropAsk(session.user.id, id);
    if (!dropped) return NextResponse.json({ error: "That one isn’t waiting any more." }, { status: 404 });
    return NextResponse.json({ next: next?.toISOString() ?? null });
  } catch (err) {
    return companionError(err);
  }
}
