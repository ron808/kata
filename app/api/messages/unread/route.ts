import { NextResponse } from "next/server";
import { handleError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { unreadMessages } from "@/lib/social/messages";

/** How many messages are waiting: the shell's badge asks every so often. */
export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    return NextResponse.json({ unread: await unreadMessages(session.user.id) });
  } catch (err) {
    return handleError(err);
  }
}
