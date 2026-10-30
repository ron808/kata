import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { User, type IMemory } from "@/lib/db/models/User";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";

/** What Kata remembers about the writer: theirs to read, add to and delete. */

const toMemory = (m: IMemory) => ({ _id: String(m._id), text: m.text, at: new Date(m.at).toISOString() });

async function memoriesOf(userId: string) {
  const user = await User.findById(userId).select("memories").lean<{ memories?: IMemory[] }>();
  return (user?.memories ?? []).map(toMemory).reverse();
}

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    return NextResponse.json({ memories: await memoriesOf(session.user.id) });
  } catch (err) {
    return handleError(err);
  }
}

const AddSchema = z.object({ text: z.string().trim().min(1).max(200) });

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);
    const { text } = AddSchema.parse(await request.json().catch(() => null));
    await connectDB();
    await User.updateOne(
      { _id: session.user.id },
      { $push: { memories: { $each: [{ text: text.replace(/\s+/g, " "), at: new Date() }], $slice: -40 } } }
    );
    return NextResponse.json({ memories: await memoriesOf(session.user.id) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!mongoose.isObjectIdOrHexString(id)) return jsonError("Not found", 404);
    await connectDB();
    await User.updateOne({ _id: session.user.id }, { $pull: { memories: { _id: new mongoose.Types.ObjectId(id) } } });
    return NextResponse.json({ memories: await memoriesOf(session.user.id) });
  } catch (err) {
    return handleError(err);
  }
}
