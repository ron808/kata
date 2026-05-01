import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth/authOptions";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  return { session, response: null } as const;
}

export function jsonError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra ? { details: extra } : {}) }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError("Invalid request", 400, err.flatten());
  }
  if (err instanceof Error) {
    if (err.message.includes("MONGODB_URI")) {
      return jsonError(
        "Database not configured. Set MONGODB_URI in your .env.local.",
        503
      );
    }
    if (err.message === "Unauthorized") return jsonError("Unauthorized", 401);
    if (err.message === "Forbidden") return jsonError("Forbidden", 403);
    if (err.message === "Not found") return jsonError("Not found", 404);
    return jsonError(err.message, 500);
  }
  return jsonError("Internal error", 500);
}
