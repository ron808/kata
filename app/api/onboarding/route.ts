import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { companionError } from "@/lib/companion/http";
import { onboard } from "@/lib/companion/onboarding";
import { OnboardingSchema } from "@/lib/companion/schemas";

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);

    const data = OnboardingSchema.parse(await request.json().catch(() => null));
    return NextResponse.json(await onboard(session.user.id, data));
  } catch (err) {
    return companionError(err);
  }
}
