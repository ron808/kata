import { NextResponse } from "next/server";
import { handleError, requireUser } from "@/lib/api";
import { connectDB } from "@/lib/db/mongoose";
import { listConversations, unreadMessages } from "@/lib/social/messages";

/** Everyone the writer is writing with, the latest first. */
export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    const [conversations, unread] = await Promise.all([listConversations(session.user.id), unreadMessages(session.user.id)]);
    return NextResponse.json({ conversations, unread });
  } catch (err) {
    return handleError(err);
  }
}
