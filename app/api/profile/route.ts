import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User, type IUser } from "@/lib/db/models/User";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { isDuplicateKey } from "@/lib/social/db";
import { hueOf } from "@/lib/social/dto";
import { HANDLE_TAKEN, checkHandle } from "@/lib/social/handles";
import { loadMe } from "@/lib/social/load";
import { ProfilePatchSchema, parseBody } from "@/lib/social/schemas";
import { ROLE_PRESETS } from "@/lib/roles";

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    const me = await loadMe(session.user.id);
    if (!me) return jsonError("Account not found.", 404);
    return NextResponse.json(me);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    const data = await parseBody(request, ProfilePatchSchema);
    await connectDB();
    const user = await User.findById(session.user.id).select("handle isPublic hue").lean();
    if (!user) return jsonError("Account not found.", 404);

    const set: Partial<Pick<IUser, "handle" | "name" | "bio" | "isPublic" | "interests" | "hue" | "role">> = {};
    if (data.handle !== undefined) {
      const check = await checkHandle(data.handle, session.user.id);
      if (!check.ok) return jsonError(check.reason, check.taken ? 409 : 400);
      set.handle = check.handle;
    }
    if (data.name !== undefined) set.name = data.name;
    if (data.bio !== undefined) set.bio = data.bio;
    if (data.role !== undefined) {
      if (!ROLE_PRESETS.some((p) => p.name === data.role)) return jsonError("Choose one from the list.", 400);
      set.role = data.role;
    }
    if (data.interests !== undefined) set.interests = data.interests;
    if (data.isPublic !== undefined) set.isPublic = data.isPublic;
    if ((set.isPublic ?? user.isPublic) && !(set.handle ?? user.handle)) {
      return jsonError("Choose a handle before making your profile public.", 400);
    }
    // Accounts from before `hue` existed: store the colour they've been shown so far.
    if (typeof user.hue !== "number") set.hue = hueOf(user);

    try {
      await User.updateOne({ _id: user._id }, { $set: set }, { runValidators: true });
    } catch (err) {
      // Someone claimed the same handle between the check and the write.
      if (isDuplicateKey(err)) return jsonError(HANDLE_TAKEN, 409);
      throw err;
    }
    return NextResponse.json(await loadMe(session.user.id));
  } catch (err) {
    return handleError(err);
  }
}
