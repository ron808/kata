import { NextResponse } from "next/server";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Entry } from "@/lib/db/models/Entry";
import { Digest } from "@/lib/db/models/Digest";
import { GROQ_MODEL, groq, isGroqConfigured } from "@/lib/ai/groq";
import { monthlyPrompt, weeklyPrompt } from "@/lib/ai/prompts";
import { addDays, todayUtcMidnight } from "@/lib/utils/dates";
import { handleError, jsonError } from "@/lib/api";

export const maxDuration = 60;

async function generateForUser(
  user: { _id: Types.ObjectId; name: string; role: string },
  kind: "weekly" | "monthly"
) {
  const today = todayUtcMidnight();
  const periodEnd = today;
  const periodStart =
    kind === "weekly" ? addDays(today, -7) : addDays(today, -30);

  const entries = await Entry.find({
    userId: user._id,
    date: { $gte: periodStart, $lt: periodEnd },
  })
    .sort({ date: 1 })
    .lean();

  if (entries.length === 0) return null;

  const wordCount = entries.reduce((s, e) => s + e.wordCount, 0);

  const monthName = today.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  const prompt =
    kind === "weekly"
      ? weeklyPrompt({ name: user.name, role: user.role, entries })
      : monthlyPrompt({
          name: user.name,
          role: user.role,
          month: monthName,
          year: today.getUTCFullYear(),
          entries,
        });

  const completion = await groq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: 0.7,
    max_tokens: kind === "weekly" ? 500 : 800,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) return null;

  const digest = await Digest.create({
    userId: user._id,
    type: kind,
    periodStart,
    periodEnd,
    content,
    entryCount: entries.length,
    wordCount,
  });

  await User.findByIdAndUpdate(user._id, {
    [kind === "weekly" ? "lastWeeklyDigest" : "lastMonthlyDigest"]: today,
  });

  return digest;
}

export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const provided =
      request.headers.get("x-cron-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!secret || provided !== secret) {
      return jsonError("Unauthorized", 401);
    }
    if (!isGroqConfigured()) return jsonError("Groq not configured", 503);

    await connectDB();

    const today = todayUtcMidnight();
    const isSunday = today.getUTCDay() === 0;
    const isFirstOfMonth = today.getUTCDate() === 1;
    const url = new URL(request.url);
    const force = url.searchParams.get("force");
    const runWeekly = isSunday || force === "weekly" || force === "all";
    const runMonthly = isFirstOfMonth || force === "monthly" || force === "all";

    if (!runWeekly && !runMonthly) {
      return NextResponse.json({ skipped: true, reason: "not a digest day" });
    }

    const users = await User.find({ activeTemplateId: { $ne: null } })
      .select("_id name role")
      .lean();

    let weekly = 0;
    let monthly = 0;
    for (const user of users) {
      try {
        if (runWeekly && (await generateForUser(user, "weekly"))) weekly++;
        if (runMonthly && (await generateForUser(user, "monthly"))) monthly++;
      } catch (err) {
        console.error("digest:user", String(user._id), err);
      }
    }

    return NextResponse.json({ weekly, monthly, total: users.length });
  } catch (err) {
    return handleError(err);
  }
}
