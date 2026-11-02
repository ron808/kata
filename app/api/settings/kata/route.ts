import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { CHECK_INS, FOCUS_THEMES, User, type IUser } from "@/lib/db/models/User";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { COMPANION_NAME_MAX, NICKNAME_MAX, companionHueOf, companionNameOf, nicknameOf, tidyName } from "@/lib/companion/name";
import { nameReceipts, noteNames } from "@/lib/companion/naming";
import { validTimeZone } from "@/lib/companion/time";

// The companion's own settings for the signed-in writer: when it checks in and the names
// they use for each other. Interests live on /api/profile.
const KataSettingsSchema = z.object({
  checkIn: z.enum(CHECK_INS).optional(),
  /** Empty brings back the default name. */
  companionName: z.string().max(COMPANION_NAME_MAX * 2).optional(),
  /** Empty means their first name. */
  nickname: z.string().max(NICKNAME_MAX * 2).optional(),
  /** The colour it wears: a hue 1–7, or null for vermilion. */
  companionHue: z.number().int().min(1).max(7).nullable().optional(),
  /** Where they are now, from their device. */
  timezone: z.string().max(60).optional(),
  /** The colours focus wears. */
  focusTheme: z.enum(FOCUS_THEMES).optional(),
});

type Settings = Pick<IUser, "checkIn" | "companionName" | "nickname" | "name" | "companionHue">;

const view = (user: Settings) => ({
  checkIn: user.checkIn ?? "morning",
  companionName: companionNameOf(user),
  nickname: nicknameOf(user),
  companionHue: companionHueOf(user),
});

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    await connectDB();
    const user = await User.findById(session.user.id).select("checkIn companionName nickname name companionHue").lean<Settings>();
    if (!user) return jsonError("Account not found.", 404);
    return NextResponse.json(view(user));
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;

    // A missing or malformed body fails validation (400) instead of throwing a 500.
    const data = KataSettingsSchema.parse(await request.json().catch(() => undefined));
    await connectDB();

    const set: Partial<Pick<IUser, "checkIn" | "companionName" | "nickname" | "companionHue" | "timezone" | "focusTheme">> = {};
    if (data.checkIn) set.checkIn = data.checkIn;
    if (data.focusTheme) set.focusTheme = data.focusTheme;
    if (data.timezone && validTimeZone(data.timezone) === data.timezone) set.timezone = data.timezone;
    if (data.companionName !== undefined) set.companionName = tidyName(data.companionName, COMPANION_NAME_MAX);
    if (data.nickname !== undefined) set.nickname = tidyName(data.nickname, NICKNAME_MAX);
    if (data.companionHue !== undefined) set.companionHue = data.companionHue;
    const before = await User.findById(session.user.id).select("companionName nickname name").lean<Settings>();
    if (!before) return jsonError("Account not found.", 404);
    const user = await User.findOneAndUpdate(
      { _id: session.user.id },
      { $set: set },
      { returnDocument: "after", runValidators: true }
    )
      .select("checkIn companionName nickname name companionHue")
      .lean<Settings>();
    if (!user) return jsonError("Account not found.", 404);
    const [was, now] = [view(before), view(user)];
    await noteNames(
      session.user.id,
      nameReceipts(now.companionName !== was.companionName ? now.companionName : null, now.nickname !== was.nickname ? now.nickname : null)
    );
    return NextResponse.json(now);
  } catch (err) {
    return handleError(err);
  }
}
