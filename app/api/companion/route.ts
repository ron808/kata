import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { isGroqConfigured } from "@/lib/ai/groq";
import { answerFreely, asksSomething, breakDown, busy, choose, converse, goTo, missionWords, type MaruExchange, type Seen } from "@/lib/companion/brain";
import { answer, moodSaid, say } from "@/lib/companion/engine";
import { companionError } from "@/lib/companion/http";
import { loadCompanion } from "@/lib/companion/load";
import { toKataMessage } from "@/lib/companion/messages";
import { CompanionPostSchema } from "@/lib/companion/schemas";
import { listThreads } from "@/lib/companion/threads";

export const maxDuration = 60;

export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    return NextResponse.json({ ...(await loadCompanion(session.user.id)), ai: isGroqConfigured() });
  } catch (err) {
    return companionError(err);
  }
}

/**
 * Maru's model when there is one, its rules when there isn't. "Open …" needs neither. If no
 * model can take the turn (the free tier's per-minute limit, usually), news still goes to the
 * rules, which keep the map current; a question or request gets an honest "try again".
 */
async function talk(userId: string, text: string, seen: Seen): Promise<MaruExchange> {
  // Before breakdowns: in focus, "give me a report" means the mission.
  const went = (await goTo(userId, text)) ?? (await missionWords(userId, text)) ?? (await breakDown(userId, text));
  if (went) return went;
  const mood = await moodSaid(userId, text);
  if (mood) return refreshing(mood);
  if (!isGroqConfigured()) return refreshing(await say(userId, text));
  try {
    return await converse(userId, text, seen);
  } catch (err) {
    console.error("companion:brain", err);
    // The rules only know news about threads: talk about posts waits for the model.
    const posts = /^\/(?:people|u\/)/.test(seen.where ?? "") || Boolean(seen.focus);
    if (!asksSomething(text) && !posts) return refreshing(await say(userId, text));
    return busy(userId, text);
  }
}

/** The rules may have moved a thread: the page they're on shows it. */
const refreshing = (e: MaruExchange): MaruExchange => ({ ...e, actions: [...(e.actions ?? []), { type: "refresh" }] });

export async function POST(request: Request) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const limit = await checkLimit(limiters.general, `kata:${session.user.id}`);
    if (!limit.ok) return jsonError("Too many requests. Try again in a minute.", 429);

    const data = CompanionPostSchema.parse(await request.json().catch(() => null));
    const userId = session.user.id;
    let exchange: MaruExchange;
    if ("messageId" in data && data.value.startsWith("do:")) {
      // A choice Maru offered: it runs as stored, with what its form was filled in with, without the model.
      exchange = await choose(userId, data.messageId, data.value, data.edit, data.inputs);
    } else if ("messageId" in data && !data.value.startsWith("say:")) {
      // Check-in replies are the scripted ones: the rules handle them exactly.
      exchange = refreshing(await answer(userId, data.messageId, data.value));
    } else if ("messageId" in data) {
      const said = (await answerFreely(userId, data.messageId, data.value)).label;
      exchange = await talk(userId, said, { where: data.where, screen: data.screen, here: data.here, focus: data.focus });
    } else {
      exchange = await talk(userId, data.text, { where: data.where, screen: data.screen, here: data.here, focus: data.focus });
    }
    const { ctx, created, actions = [] } = exchange;

    return NextResponse.json({
      messages: created.map(toKataMessage),
      threads: await listThreads(ctx),
      actions,
    });
  } catch (err) {
    return companionError(err);
  }
}
