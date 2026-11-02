import { nanoid } from "nanoid";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { CompanionMessage } from "@/lib/db/models/CompanionMessage";
import { Template, type ITemplateField } from "@/lib/db/models/Template";
import { User, type IUser } from "@/lib/db/models/User";
import { ROLE_PRESETS } from "@/lib/roles";
import { roleKeyOf } from "@/lib/questions/daily";
import type { KataMessage, ThreadT } from "@/lib/types";
import { hourIn } from "@/lib/utils/dates";
import { chooseCheckins } from "./checkins";
import { moodQuestion } from "./copy";
import { activeThreads, historyFor } from "./engine";
import { CompanionError } from "./errors";
import { candidatesFromItems } from "./extract";
import { insertDrafts, isDuplicateKey, messagesForDay, MOOD_REPLIES, stableId, toKataMessage, type Draft } from "./messages";
import type { OnboardingInput } from "./schemas";
import { joinList, ref, seedOf } from "./text";
import { applyCandidates, knownThreads, listThreads, type Ctx } from "./threads";
import { addDays, localDay, validTimeZone } from "./time";
import { COMPANION_NAME_MAX, NICKNAME_MAX, nicknameOf, tidyName } from "./name";

export interface Onboarded {
  templateId: string;
  threads: ThreadT[];
  /** Today's conversation, ending with Kata's first message. */
  messages: KataMessage[];
}

function normalizeInterests(interests: string[]): string[] {
  return Array.from(new Set(interests.map((i) => i.trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean))).slice(0, 12);
}

/**
 * Sets the writer up: role, today's page, the threads they named, and Kata's
 * first message. Safe to call twice: the second call updates instead of
 * creating another template or another first message.
 */
export async function onboard(userId: string, input: OnboardingInput): Promise<Onboarded> {
  await connectDB();
  const preset = ROLE_PRESETS.find((p) => p.key === input.role) ?? ROLE_PRESETS[ROLE_PRESETS.length - 1];
  const now = new Date();

  // Claiming onboardedAt first means a double submit can't create two templates.
  const claimed = await User.findOneAndUpdate(
    { _id: userId, onboardedAt: null },
    { $set: { onboardedAt: now } },
    { returnDocument: "after" }
  ).lean<IUser>();
  const user = claimed ?? (await User.findById(userId).lean<IUser>());
  if (!user) throw new CompanionError("Not found", 404);

  const fields: ITemplateField[] =
    input.fields ?? preset.fields.map((f, i) => ({ ...f, id: nanoid(8), order: i, config: { ...f.config } }));
  const current = user.activeTemplateId
    ? await Template.findOne({ _id: user.activeTemplateId, userId }).select("_id").lean<{ _id: Types.ObjectId }>()
    : null;
  let templateId: Types.ObjectId;
  if (!current) {
    const created = await Template.create({
      userId,
      name: `${preset.name} starter`,
      description: preset.description,
      tags: [],
      fields,
    });
    templateId = created._id;
  } else {
    templateId = current._id;
    // A page they already had stays theirs: setting up the companion is no reason to swap it.
    if (!claimed && (input.fields || roleKeyOf(user.role) !== input.role)) {
      await Template.updateOne(
        { _id: current._id, userId },
        { $set: { name: `${preset.name} starter`, description: preset.description, fields } }
      );
    }
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        role: preset.name,
        interests: normalizeInterests(input.interests),
        checkIn: input.checkIn,
        activeTemplateId: templateId,
        ...(input.companionName !== undefined ? { companionName: tidyName(input.companionName, COMPANION_NAME_MAX) } : {}),
        ...(input.nickname !== undefined ? { nickname: tidyName(input.nickname, NICKNAME_MAX) } : {}),
        ...(input.companionHue !== undefined ? { companionHue: input.companionHue } : {}),
      },
    }
  );

  const tz = validTimeZone(user.timezone);
  const ctx: Ctx = { userId, tz, now, day: localDay(tz, now) };
  const focus = candidatesFromItems(input.focus, { known: await knownThreads(userId), today: ctx.day });
  const applied = await applyCandidates(ctx, focus, { from: "you", source: "kata", onlyCreate: true });

  // Name exactly what tomorrow's check-ins will pick, so the promise holds.
  const tomorrow = { ...ctx, day: addDays(ctx.day, 1) };
  const planned = chooseCheckins(await activeThreads(ctx), tomorrow, await historyFor(tomorrow));
  const first = (input.nickname && tidyName(input.nickname, NICKNAME_MAX)) || nicknameOf(user);
  const hello = `Good to meet you${first ? `, ${first}` : ""}.`;
  const when = input.checkIn === "evening" ? "Tomorrow evening" : "Tomorrow morning";
  const tracked = applied.created.map(ref);
  const text = planned.length
    ? `${hello} ${when} I'll ask about ${joinList(planned.map((p) => ref(p.thread)))}.`
    : tracked.length
      ? `${hello} I'll keep track of ${joinList(tracked.slice(0, 3))}.`
      : `${hello} Tell me what you're working on and I'll keep track of it.`;

  const firstId = stableId(userId, "onboarding");
  const existing = await CompanionMessage.findOne({ _id: firstId, userId }).select("day").lean();
  if (existing) {
    if (existing.day === ctx.day) await CompanionMessage.updateOne({ _id: firstId, userId }, { $set: { text } });
  } else {
    const today = await messagesForDay(userId, ctx.day);
    const drafts: Draft[] = [
      {
        _id: firstId,
        from: "kata",
        kind: today.some((m) => m.from === "kata" && m.kind === "greeting") ? "note" : "greeting",
        text,
      },
    ];
    if (!today.some((m) => m.from === "kata" && (m.kind === "mood" || m.kind === "nudge"))) {
      drafts.push({
        _id: stableId(userId, "onboarding-mood"),
        from: "kata",
        kind: "mood",
        text: moodQuestion(hourIn(tz, now), seedOf(userId, ctx.day, "mood")),
        replies: MOOD_REPLIES,
      });
    }
    try {
      await insertDrafts(userId, ctx.day, drafts);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  }

  return {
    templateId: String(templateId),
    threads: await listThreads(ctx),
    messages: (await messagesForDay(userId, ctx.day)).map(toKataMessage),
  };
}
