import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { companionError } from "@/lib/companion/http";
import { questionsFor } from "@/lib/companion/load";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    return NextResponse.json(await questionsFor(session.user.id));
  } catch (err) {
    return companionError(err);
  }
}
