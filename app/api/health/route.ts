import { NextResponse } from "next/server";
import { checkIndexes, connectDB } from "@/lib/db/mongoose";

export const dynamic = "force-dynamic";

/** Whether the database answers and its indexes match the code. Nothing private, so anyone can ask after a deploy. */
export async function GET() {
  try {
    await connectDB();
    const indexes = await checkIndexes();
    return NextResponse.json({ ok: !indexes.failed.length, database: "up", indexes });
  } catch (err) {
    console.error("health", err);
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
