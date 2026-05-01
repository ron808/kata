import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { ForgotPasswordSchema } from "@/lib/validation/schemas";
import { handleError, jsonError } from "@/lib/api";
import { checkLimit, clientIdentifier, limiters } from "@/lib/ratelimit/upstash";
import { appBaseUrl, sendEmail } from "@/lib/email";

const TOKEN_TTL_MIN = 30;

export async function POST(request: Request) {
  try {
    const ip = clientIdentifier(request);
    const limit = await checkLimit(limiters.forgotPassword, `forgot:${ip}`);
    if (!limit.ok) return jsonError("Too many requests. Try again later.", 429);

    const body = await request.json();
    const { email } = ForgotPasswordSchema.parse(body);

    await connectDB();
    const user = await User.findOne({ email }).select("_id email").lean();

    // Always return 200 — don't reveal whether the email exists.
    if (!user) return NextResponse.json({ ok: true });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const link = `${appBaseUrl()}/reset/${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your Kata password",
      text:
        `Someone asked to reset your Kata password.\n\n` +
        `If it was you, open this link within ${TOKEN_TTL_MIN} minutes:\n${link}\n\n` +
        `If it wasn't you, you can safely ignore this email — your password won't change.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.6; color:#222; max-width:520px;">
          <h2 style="font-weight:600;">Reset your Kata password</h2>
          <p>Someone asked to reset your Kata password.</p>
          <p>If it was you, open this link within <strong>${TOKEN_TTL_MIN} minutes</strong>:</p>
          <p><a href="${link}" style="color:#cf6f4d;">${link}</a></p>
          <p style="color:#666;font-size:13px;margin-top:24px;">
            If it wasn't you, you can safely ignore this email — your password won't change.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
