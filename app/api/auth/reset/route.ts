import { NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { ResetPasswordSchema } from "@/lib/validation/schemas";
import { handleError, jsonError } from "@/lib/api";
import { checkLimit, clientIdentifier, limiters } from "@/lib/ratelimit/upstash";

export async function POST(request: Request) {
  try {
    const ip = clientIdentifier(request);
    const limit = await checkLimit(limiters.resetPassword, `reset:${ip}`);
    if (!limit.ok) return jsonError("Too many requests. Try again later.", 429);

    const body = await request.json();
    const { token, password } = ResetPasswordSchema.parse(body);

    await connectDB();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await PasswordResetToken.findOne({ tokenHash });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      if (record) await record.deleteOne();
      return jsonError("This reset link has expired. Request a new one.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.updateOne({ _id: record.userId }, { $set: { passwordHash } });
    // Single-use: delete this token, and any other outstanding tokens for the user.
    await PasswordResetToken.deleteMany({ userId: record.userId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
