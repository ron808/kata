import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, requireUser } from "@/lib/api";
import { discoverPeople, suggestedPeople } from "@/lib/social/people";
import { PeopleQuerySchema, parseQuery } from "@/lib/social/schemas";

export async function GET(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    const { q, role, tag, suggested } = parseQuery(request, PeopleQuerySchema);
    await connectDB();
    const people = suggested
      ? await suggestedPeople(session.user.id)
      : await discoverPeople(session.user.id, { q, role, tag });
    return NextResponse.json(people);
  } catch (err) {
    return handleError(err);
  }
}
