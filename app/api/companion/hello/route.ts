import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { sayHello } from "@/lib/companion/hello";
import { companionError } from "@/lib/companion/http";

/** They've come back: Maru says hi and asks something, when that makes sense. No model involved. */
export async function POST() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    return NextResponse.json({ message: await sayHello(session.user.id) });
  } catch (err) {
    return companionError(err);
  }
}
