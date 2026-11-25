import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { ChangePasswordSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { sessionsChanged } from "@/lib/auth/sessions";

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    const body = await request.json();
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(body);

    if (currentPassword === newPassword) {
      return jsonError(
        "New password must be different from your current one.",
        400
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id).select("passwordHash email loginFails loginFailAt");
    if (!user) return jsonError("Account not found.", 404);

    // Wrong guesses here count with sign-in's, so a signed-in device can't try passwords freely either.
    const now = Date.now();
    const inWindow = Boolean(user.loginFailAt) && now - user.loginFailAt!.getTime() < 15 * 60_000;
    if (inWindow && (user.loginFails ?? 0) >= 10) return jsonError("Too many wrong passwords. Try again in 15 minutes.", 429);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      await User.updateOne({ _id: user._id }, inWindow ? { $inc: { loginFails: 1 } } : { $set: { loginFails: 1, loginFailAt: new Date(now) } });
      return jsonError("Current password is incorrect.", 400);
    }

    // A new password ends every session made with the old one, here included: the form signs this device in again.
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordHash: await bcrypt.hash(newPassword, 10), loginFails: 0, loginFailAt: null }, $inc: { sessionVersion: 1 } }
    );
    sessionsChanged(String(user._id));

    // Invalidate any outstanding reset tokens — the password just changed.
    await PasswordResetToken.deleteMany({ userId: user._id });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    return handleError(err);
  }
}
