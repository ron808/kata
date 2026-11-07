import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { Breakdown } from "@/lib/db/models/Breakdown";
import { CompanionMessage } from "@/lib/db/models/CompanionMessage";
import { Conversation } from "@/lib/db/models/Conversation";
import { Digest } from "@/lib/db/models/Digest";
import { DirectMessage } from "@/lib/db/models/DirectMessage";
import { Entry } from "@/lib/db/models/Entry";
import { Follow } from "@/lib/db/models/Follow";
import { Mission } from "@/lib/db/models/Mission";
import { Moment } from "@/lib/db/models/Moment";
import { Notification } from "@/lib/db/models/Notification";
import { PasswordResetToken } from "@/lib/db/models/PasswordResetToken";
import { Reaction } from "@/lib/db/models/Reaction";
import { Reply } from "@/lib/db/models/Reply";
import { Template } from "@/lib/db/models/Template";
import { Thread } from "@/lib/db/models/Thread";
import { User } from "@/lib/db/models/User";
import { formatDate } from "@/lib/utils/dates";

/**
 * Starting fresh and leaving. Start fresh clears what a writer picks and keeps the account, profile, handle,
 * people, messages and page layouts; deleting removes the account and everything in it. Either way, what they
 * left on other people's posts comes off with it, and the counts others see stay true.
 */

/** What start fresh can clear. Breakdowns go with pages or threads, since they're worked out from them. */
export const FRESH_PARTS = ["pages", "threads", "maru", "posts"] as const;
export type FreshPart = (typeof FRESH_PARTS)[number];

export interface AccountCounts {
  pages: number;
  letters: number;
  threads: number;
  lists: number;
  memories: number;
  posts: number;
  replies: number;
  people: number;
  conversations: number;
}

const idOf = (userId: string) => new Types.ObjectId(userId);

export async function accountCounts(userId: string): Promise<AccountCounts> {
  const uid = idOf(userId);
  const [pages, letters, threads, lists, user, posts, replies, following, followers, conversations] = await Promise.all([
    Entry.countDocuments({ userId: uid }),
    Digest.countDocuments({ userId: uid }),
    Thread.countDocuments({ userId: uid }),
    Mission.countDocuments({ userId: uid }),
    User.findById(uid).select("memories").lean(),
    Moment.countDocuments({ userId: uid }),
    Reply.countDocuments({ userId: uid }),
    Follow.countDocuments({ followerId: uid }),
    Follow.countDocuments({ followeeId: uid }),
    Conversation.countDocuments({ members: uid }),
  ]);
  return { pages, letters, threads, lists, memories: user?.memories?.length ?? 0, posts, replies, people: following + followers, conversations };
}

/** Their own password, checked again: nothing here happens on a session alone. */
export async function passwordMatches(userId: string, password: string): Promise<boolean> {
  const user = await User.findById(idOf(userId)).select("passwordHash").lean();
  return Boolean(user?.passwordHash) && (await bcrypt.compare(password, user!.passwordHash));
}

const atLeastZero = (path: string, by: number) => ({ $set: { [path]: { $max: [0, { $subtract: [`$${path}`, by] }] } } });

/** Their posts with everything on them, and what they left on other people's posts, off those posts' counts. */
async function removePosts(uid: Types.ObjectId): Promise<void> {
  const mine = (await Moment.find({ userId: uid }).select("_id").lean()).map((m) => m._id);
  const [replies, reactions] = await Promise.all([
    Reply.find({ userId: uid, momentId: { $nin: mine } }).select("momentId").lean(),
    Reaction.find({ userId: uid, momentId: { $nin: mine } }).select("momentId kind").lean(),
  ]);
  const off = new Map<string, Map<string, number>>();
  const add = (moment: Types.ObjectId, path: string) => {
    const counts = off.get(String(moment)) ?? new Map<string, number>();
    counts.set(path, (counts.get(path) ?? 0) + 1);
    off.set(String(moment), counts);
  };
  for (const r of replies) add(r.momentId, "replyCount");
  for (const r of reactions) add(r.momentId, `reactions.${r.kind}`);
  await Promise.all(
    [...off].map(([moment, counts]) =>
      Moment.updateOne({ _id: moment }, [...counts].map(([path, n]) => atLeastZero(path, n)), { updatePipeline: true })
    )
  );
  await Promise.all([
    Reply.deleteMany({ $or: [{ userId: uid }, { momentId: { $in: mine } }] }),
    Reaction.deleteMany({ $or: [{ userId: uid }, { momentId: { $in: mine } }] }),
    // What anyone was told about these posts, and what others were told about this writer's replies and reactions.
    Notification.deleteMany({ $or: [{ momentId: { $in: mine } }, { actorId: uid, kind: { $in: ["reply", "reaction"] } }] }),
    Moment.deleteMany({ userId: uid }),
  ]);
}

/** Who they follow and who follows them, with everyone else's counts kept true. */
async function removeFollows(uid: Types.ObjectId): Promise<void> {
  const [out, back] = await Promise.all([
    Follow.find({ followerId: uid }).select("followeeId").lean(),
    Follow.find({ followeeId: uid }).select("followerId").lean(),
  ]);
  await Promise.all([
    User.updateMany({ _id: { $in: out.map((f) => f.followeeId) }, followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } }),
    User.updateMany({ _id: { $in: back.map((f) => f.followerId) }, followingCount: { $gt: 0 } }, { $inc: { followingCount: -1 } }),
  ]);
  await Follow.deleteMany({ $or: [{ followerId: uid }, { followeeId: uid }] });
}

/** Conversations are addressed by the other person's handle, so one with a deleted account goes for both. */
async function removeConversations(uid: Types.ObjectId): Promise<void> {
  const ids = (await Conversation.find({ members: uid }).select("_id").lean()).map((c) => c._id);
  await DirectMessage.deleteMany({ conversationId: { $in: ids } });
  await Conversation.deleteMany({ _id: { $in: ids } });
}

export async function startFresh(userId: string, parts: readonly FreshPart[], setupAgain: boolean): Promise<void> {
  const uid = idOf(userId);
  const has = (p: FreshPart) => parts.includes(p);
  await Promise.all([
    ...(has("pages") ? [Entry.deleteMany({ userId: uid }), Digest.deleteMany({ userId: uid })] : []),
    ...(has("threads") ? [Thread.deleteMany({ userId: uid }), Mission.deleteMany({ userId: uid })] : []),
    ...(has("pages") || has("threads") ? [Breakdown.deleteMany({ userId: uid })] : []),
    ...(has("maru") ? [CompanionMessage.deleteMany({ userId: uid })] : []),
  ]);
  if (has("posts")) await removePosts(uid);
  const set = {
    ...(has("pages") ? { streak: 0, longestStreak: 0, totalEntries: 0, totalWords: 0, lastEntryDate: null } : {}),
    ...(has("threads") ? { focusMissionId: null } : {}),
    ...(has("maru") ? { memories: [] } : {}),
    ...(setupAgain ? { onboardedAt: null } : {}),
  };
  if (Object.keys(set).length) await User.updateOne({ _id: uid }, { $set: set });
}

/** Everything goes. The account itself goes last, so a failure part way leaves something to try again with. */
export async function deleteAccount(userId: string): Promise<void> {
  const uid = idOf(userId);
  await removePosts(uid);
  await removeFollows(uid);
  await removeConversations(uid);
  await Promise.all([
    Entry.deleteMany({ userId: uid }),
    Digest.deleteMany({ userId: uid }),
    Thread.deleteMany({ userId: uid }),
    Mission.deleteMany({ userId: uid }),
    Breakdown.deleteMany({ userId: uid }),
    CompanionMessage.deleteMany({ userId: uid }),
    Template.deleteMany({ userId: uid }),
    Notification.deleteMany({ $or: [{ userId: uid }, { actorId: uid }] }),
    PasswordResetToken.deleteMany({ userId: uid }),
  ]);
  await User.deleteOne({ _id: uid });
}

/** A field's answer as text: lists one per line, a yes or no in words. */
function answerText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((v) => answerText(v)).filter(Boolean).map((v) => `- ${v.replace(/\n+/g, " ")}`).join("\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, answerText(v)] as const)
      .filter(([, v]) => v)
      .map(([k, v]) => `- ${k}: ${v.replace(/\n+/g, " ")}`)
      .join("\n");
  }
  return "";
}

/** Every page they wrote, what they kept track of and what was remembered, as one Markdown file to keep. */
export async function exportPages(userId: string, companion: string): Promise<{ filename: string; text: string }> {
  const uid = idOf(userId);
  const [user, entries, threads] = await Promise.all([
    User.findById(uid).select("name memories").lean(),
    Entry.find({ userId: uid }).sort({ date: 1 }).select("date fields").lean(),
    Thread.find({ userId: uid }).sort({ createdAt: 1 }).select("title kind status").lean(),
  ]);
  const now = new Date();
  const out = [`# ${user?.name ? `${user.name}’s` : "Your"} pages on Kata`, "",`Downloaded ${formatDate(now, "long", "UTC")}. ${entries.length === 1 ? "1 page" : `${entries.length} pages`}.`];
  for (const e of entries) {
    const answered = e.fields.map((f) => [f.label, answerText(f.value)] as const).filter(([, a]) => a);
    if (!answered.length) continue;
    out.push("", `## ${formatDate(new Date(e.date), "long", "UTC")}`);
    for (const [label, a] of answered) out.push("", `### ${label}`, "", a);
  }
  if (threads.length) {
    out.push("", `## What ${companion} kept track of`, "");
    for (const t of threads) out.push(`- ${t.title} (${t.kind}, ${t.status})`);
  }
  if (user?.memories?.length) {
    out.push("", `## What ${companion} remembered`, "");
    for (const m of user.memories) out.push(`- ${m.text}`);
  }
  return { filename: `kata-pages-${now.toISOString().slice(0, 10)}.md`, text: `${out.join("\n")}\n` };
}
