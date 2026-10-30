import { cache } from "react";
import type { IReceipt } from "@/lib/db/models/CompanionMessage";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { ensureToday } from "./engine";
import { insertDrafts } from "./messages";
import { DEFAULT_COMPANION, companionHueOf, companionNameOf, nicknameOf } from "./name";

export interface Names {
  /** The companion's name. */
  name: string;
  /** What the companion calls the writer. */
  nickname: string;
  /** The hue it wears, or null for vermilion. */
  hue: number | null;
}

/** The writer's names for their companion and themselves, read once per request however many places ask. */
export const namesFor = cache(async (userId: string): Promise<Names> => {
  try {
    await connectDB();
    const user = await User.findById(userId).select("name companionName nickname companionHue").lean();
    return { name: companionNameOf(user), nickname: nicknameOf(user), hue: companionHueOf(user) };
  } catch {
    // No database: pages explain what's missing; the copy can still say Maru.
    return { name: DEFAULT_COMPANION, nickname: "", hue: null };
  }
});

/** Receipts for new names. */
export function nameReceipts(companion: string | null, nickname: string | null): IReceipt[] {
  return [
    ...(companion ? [{ kind: "names" as const, text: `I’m ${companion} now`, detail: "Change it any time in Settings.", href: "/settings#kata", hue: null }] : []),
    ...(nickname ? [{ kind: "names" as const, text: `Calling you ${nickname}`, detail: "", href: "/settings#kata", hue: null }] : []),
  ];
}

/**
 * Names changed in Settings: say so in today's conversation. The model reads the day's
 * messages, and without this the old name in them outweighs the new one.
 */
export async function noteNames(userId: string, receipts: IReceipt[]) {
  if (!receipts.length) return;
  const { ctx } = await ensureToday(userId);
  await insertDrafts(ctx.userId, ctx.day, [{ from: "kata", kind: "note", text: "", done: receipts }]);
}
