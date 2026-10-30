import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Notification } from "@/lib/db/models/Notification";
import { handleError, requireUser } from "@/lib/api";
import { loadNotifications } from "@/lib/social/load";
import { NotificationsPostSchema, parseBody } from "@/lib/social/schemas";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    return NextResponse.json(await loadNotifications(session.user.id));
  } catch (err) {
    return handleError(err);
  }
}

/** `{ read: "all" }` marks everything read. */
export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    await parseBody(request, NotificationsPostSchema);
    await connectDB();
    await Notification.updateMany({ userId: session.user.id, read: false }, { $set: { read: true } });
    return NextResponse.json({ ok: true, unread: 0 });
  } catch (err) {
    return handleError(err);
  }
}
