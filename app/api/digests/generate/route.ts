import { NextResponse } from "next/server";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Entry } from "@/lib/db/models/Entry";
import { Digest } from "@/lib/db/models/Digest";
import { WRITING_MODELS, complete, isGroqConfigured } from "@/lib/ai/groq";
import { monthlyPrompt, weeklyPrompt } from "@/lib/ai/prompts";
import { addDays, todayUtcMidnight } from "@/lib/utils/dates";
import { handleError, jsonError } from "@/lib/api";
import { pruneConversations } from "@/lib/companion/messages";

export const maxDuration = 60;

/** No new letter is started after this long, so a run always finishes inside maxDuration. */
const RUN_FOR_MS = 40_000;
/** Writers looked at per kind per run: the rest wait for tomorrow's run. */
const BATCH = 25;

type Kind = "weekly" | "monthly";
type Writer = { _id: Types.ObjectId; name: string; role: string };
type Period = { start: Date; end: Date };

/**
 * The stretch a letter is about: the week that ended on the latest Sunday (UTC), or the month
 * that just ended. A letter is due until it's written, so each day's run catches up on whoever
 * the last one didn't reach, and a letter is never written twice for the same stretch.
 */
function periodOf(kind: Kind, today: Date): Period {
  if (kind === "weekly") {
    const end = addDays(today, -today.getUTCDay());
    return { start: addDays(end, -7), end };
  }
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)), end };
}

const lastOf = (kind: Kind) => (kind === "weekly" ? "lastWeeklyDigest" : "lastMonthlyDigest");

/** Writers who wrote in the stretch and haven't had its letter yet. */
async function due(kind: Kind, period: Period): Promise<Writer[]> {
  const wrote = await Entry.distinct("userId", { date: { $gte: period.start, $lt: period.end } });
  if (!wrote.length) return [];
  const last = lastOf(kind);
  return User.find({ _id: { $in: wrote }, $or: [{ [last]: null }, { [last]: { $lt: period.end } }] })
    .select("_id name role")
    .limit(BATCH)
    .lean<Writer[]>();
}

async function generateForUser(user: Writer, kind: Kind, period: Period) {
  const last = lastOf(kind);
  // Claimed first, so two runs at once can't both write it; given back if the letter fails.
  const before = await User.findOneAndUpdate(
    { _id: user._id, $or: [{ [last]: null }, { [last]: { $lt: period.end } }] },
    { $set: { [last]: period.end } }
  )
    .select(last)
    .lean<{ lastWeeklyDigest?: Date | null; lastMonthlyDigest?: Date | null }>();
  if (!before) return null;
  try {
    const entries = await Entry.find({ userId: user._id, date: { $gte: period.start, $lt: period.end } })
      .sort({ date: 1 })
      .lean();
    if (entries.length === 0) return null;

    const wordCount = entries.reduce((s, e) => s + e.wordCount, 0);
    const monthName = period.start.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const prompt =
      kind === "weekly"
        ? weeklyPrompt({ name: user.name, role: user.role, entries })
        : monthlyPrompt({ name: user.name, role: user.role, month: monthName, year: period.start.getUTCFullYear(), entries });

    // Reasoning counts against max_tokens, so leave room beyond the letter itself. The call may
    // wait a few seconds for the per-minute limit instead of skipping the writer.
    const completion = await complete(
      {
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: 0.7,
        max_tokens: kind === "weekly" ? 1500 : 2200,
      },
      { models: WRITING_MODELS, timeout: 30_000, wait: 6000 }
    );

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("empty letter");

    return await Digest.create({
      userId: user._id,
      type: kind,
      periodStart: period.start,
      periodEnd: period.end,
      content,
      entryCount: entries.length,
      wordCount,
    });
  } catch (err) {
    await User.updateOne({ _id: user._id, [last]: period.end }, { $set: { [last]: before[last] ?? null } });
    throw err;
  }
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
    await connectDB();
    // Old conversations go first: it needs no model, and keeps the free cluster small.
    const pruned = await pruneConversations().catch((err) => {
      console.error("digest:prune", err);
      return null;
    });
    if (!isGroqConfigured()) return NextResponse.json({ pruned, letters: "Groq not configured" });
    const started = Date.now();
    const today = todayUtcMidnight();
    const written = { weekly: 0, monthly: 0 };
    let waiting = 0;

    for (const kind of ["weekly", "monthly"] as const) {
      const period = periodOf(kind, today);
      for (const user of await due(kind, period)) {
        if (Date.now() - started > RUN_FOR_MS) {
          waiting++;
          continue;
        }
        try {
          if (await generateForUser(user, kind, period)) written[kind]++;
        } catch (err) {
          console.error("digest:user", String(user._id), kind, err);
        }
      }
    }

    return NextResponse.json({ ...written, waiting, pruned });
  } catch (err) {
    return handleError(err);
  }
}

// Vercel's cron calls with GET. It also keeps a free Atlas cluster from pausing for inactivity.
export const GET = POST;
