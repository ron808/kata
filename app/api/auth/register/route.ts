import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { RegisterSchema } from "@/lib/validation/schemas";
import { handleError, jsonError } from "@/lib/api";
import { checkLimit, clientIdentifier, limiters } from "@/lib/ratelimit/upstash";

export async function POST(request: Request) {
  try {
    const ip = clientIdentifier(request);
    const limit = await checkLimit(limiters.register, `register:${ip}`);
    if (!limit.ok) return jsonError("Too many signups. Try again later.", 429);

    const body = await request.json();
    const data = RegisterSchema.parse(body);

    await connectDB();

    const existing = await User.findOne({ email: data.email }).lean();
    if (existing) return jsonError("That email is already registered.", 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      timezone: data.timezone,
    });

    return NextResponse.json({ id: String(user._id) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
