import { NextResponse } from "next/server";
import { z } from "zod";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { MESSAGE_MAX } from "@/lib/db/models/DirectMessage";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { STICKER_IDS } from "@/lib/stickers";
import { openConversation, sendMessage, setBlocked } from "@/lib/social/messages";

type Ctx = { params: Promise<{ handle: string }> };

const When = z.string().datetime().optional();

/** The conversation with someone: its latest messages (or older ones with ?before=, newer with ?after=). */
export async function GET(request: Request, ctx: Ctx) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { handle } = await ctx.params;
    const url = new URL(request.url);
    const before = When.safeParse(url.searchParams.get("before") ?? undefined);
    const after = When.safeParse(url.searchParams.get("after") ?? undefined);
    if (!before.success || !after.success) return jsonError("Not a time", 400);
    await connectDB();
    const open = await openConversation(session.user.id, handle, { before: before.data, after: after.data });
    if (!open) return jsonError("Not found", 404);
    return NextResponse.json(open);
  } catch (err) {
    return handleError(err);
  }
}

// Words, or one of Kata's stickers.
const SendSchema = z
  .object({ text: z.string().trim().max(MESSAGE_MAX).optional(), sticker: z.enum(STICKER_IDS).optional() })
  .refine((s) => Boolean(s.text) || Boolean(s.sticker), "A message needs words or a sticker.");

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.message, `message:${session.user.id}`);
    if (!limit.ok) return jsonError("That’s a lot of messages for one hour. Try again later.", 429);
    const { handle } = await ctx.params;
    const said = SendSchema.parse(await request.json().catch(() => null));
    await connectDB();
    const sent = await sendMessage(session.user.id, handle, said);
    if (!sent.ok) return jsonError(sent.error, sent.status);
    return NextResponse.json({ message: sent.value }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

const BlockSchema = z.object({ blocked: z.boolean() });

/** Block or unblock them. */
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const { handle } = await ctx.params;
    const { blocked } = BlockSchema.parse(await request.json().catch(() => null));
    await connectDB();
    const done = await setBlocked(session.user.id, handle, blocked);
    if (!done.ok) return jsonError(done.error, done.status);
    return NextResponse.json(done.value);
  } catch (err) {
    return handleError(err);
  }
}
