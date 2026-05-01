import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { ChangePasswordSchema } from "@/lib/validation/schemas";
import { handleError, jsonError, requireUser } from "@/lib/api";

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
    const user = await User.findById(session.user.id).select("passwordHash");
    if (!user) return jsonError("Account not found.", 404);

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return jsonError("Current password is incorrect.", 400);

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Invalidate any outstanding reset tokens — the password just changed.
    await PasswordResetToken.deleteMany({ userId: user._id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
