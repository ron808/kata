import { Types } from "mongoose";
import { Conversation, conversationKey, type IConversation } from "@/lib/db/models/Conversation";
import { DirectMessage, MESSAGE_MAX, type IDirectMessage } from "@/lib/db/models/DirectMessage";
import { Follow } from "@/lib/db/models/Follow";
import { User } from "@/lib/db/models/User";
import type { ConversationT, DirectMessageT, ThreadOpenT } from "@/lib/types";
import { isObjectId } from "./db";
import { hueOf } from "./dto";
import { HANDLE_PATTERN, NEEDS_HANDLE, normalizeHandle } from "./handles";

/*
 * Messages between two people who follow each other. Following is one tap, but writing takes
 * both: you follow, they follow back, and only then can either of you write. If one of you stops
 * following, the conversation stays to read and nothing new can be sent. Either person can block
 * the other, and then nothing new reaches them.
 */

const PAGE = 50;

type Outcome<T> = { ok: true; value: T } | { ok: false; error: string; status: number };
const fail = (error: string, status: number): { ok: false; error: string; status: number } => ({ ok: false, error, status });

type Person = { _id: Types.ObjectId; handle?: string | null; name: string; hue?: number };
const PERSON = "handle name hue";

const personOf = (u: Person) => ({ handle: u.handle ?? "", name: u.name, hue: hueOf(u) });
const firstName = (name: string) => name.split(/\s+/)[0] || name;

function toMessage(m: Pick<IDirectMessage, "_id" | "text" | "from" | "createdAt">, me: string): DirectMessageT {
  return { _id: String(m._id), text: m.text, mine: String(m.from) === me, createdAt: new Date(m.createdAt).toISOString() };
}

async function personByHandle(raw: string): Promise<Person | null> {
  const handle = normalizeHandle(raw);
  if (!HANDLE_PATTERN.test(handle)) return null;
  return User.findOne({ handle }).select(PERSON).lean<Person>();
}

/** Who follows whom between the two of them. */
async function follows(me: Person, them: Person): Promise<{ isFollowing: boolean; followsYou: boolean }> {
  const [out, back] = await Promise.all([
    Follow.exists({ followerId: me._id, followeeId: them._id }),
    Follow.exists({ followerId: them._id, followeeId: me._id }),
  ]);
  return { isFollowing: Boolean(out), followsYou: Boolean(back) };
}

/** Why the viewer can't write to them right now, or null when they can. */
async function closedReason(
  me: Person,
  them: Person,
  convo: Pick<IConversation, "blockedBy"> | null,
  link?: { isFollowing: boolean; followsYou: boolean }
): Promise<string | null> {
  if (!me.handle) return NEEDS_HANDLE;
  if (String(me._id) === String(them._id)) return "That’s you.";
  const first = firstName(them.name);
  const blockedBy = (convo?.blockedBy ?? []).map(String);
  if (blockedBy.includes(String(me._id))) return `You blocked ${first}. Unblock them to write.`;
  if (blockedBy.includes(String(them._id))) return `${first} isn’t taking messages from you.`;
  const { isFollowing, followsYou } = link ?? (await follows(me, them));
  if (isFollowing && followsYou) return null;
  if (isFollowing) return `You can write once ${first} follows you back.`;
  if (followsYou) return `${first} follows you. Follow back and you can write to each other.`;
  return `People who follow each other can write. Follow ${first}, and once they follow back you can.`;
}

/** Everyone the viewer is writing with, the latest first. */
export async function listConversations(me: string): Promise<ConversationT[]> {
  if (!isObjectId(me)) return [];
  const convos = await Conversation.find({ members: new Types.ObjectId(me) }).sort({ lastAt: -1 }).limit(PAGE).lean<IConversation[]>();
  const others = convos.map((c) => c.members.find((m) => String(m) !== me)).filter((id): id is Types.ObjectId => Boolean(id));
  const people = new Map((await User.find({ _id: { $in: others } }).select(PERSON).lean<Person[]>()).map((u) => [String(u._id), u]));
  return convos.flatMap((c) => {
    const other = c.members.find((m) => String(m) !== me);
    const person = other ? people.get(String(other)) : undefined;
    if (!person?.handle) return [];
    const unread = c.unread instanceof Map ? c.unread.get(me) : (c.unread as unknown as Record<string, number> | undefined)?.[me];
    return [
      {
        person: personOf(person),
        lastText: c.lastText,
        lastFromMe: String(c.lastFrom) === me,
        lastAt: new Date(c.lastAt).toISOString(),
        unread: unread ?? 0,
        blocked: (c.blockedBy ?? []).some((b) => String(b) === me),
      },
    ];
  });
}

/** How many messages are waiting for the viewer, across every conversation. */
export async function unreadMessages(me: string): Promise<number> {
  if (!isObjectId(me)) return 0;
  const convos = await Conversation.find({ members: new Types.ObjectId(me), [`unread.${me}`]: { $gt: 0 } })
    .select("unread")
    .lean<Pick<IConversation, "unread">[]>();
  return convos.reduce((sum, c) => sum + (((c.unread as unknown as Record<string, number>) ?? {})[me] ?? 0), 0);
}

/**
 * A conversation with someone, by their handle: the latest messages (or the ones before
 * `before`, or after `after` for what's new), and whether the viewer can write. Opening it
 * marks it read.
 */
export async function openConversation(me: string, handle: string, { before, after }: { before?: string; after?: string } = {}): Promise<ThreadOpenT | null> {
  const [mine, them] = await Promise.all([User.findById(me).select(PERSON).lean<Person>(), personByHandle(handle)]);
  if (!mine || !them?.handle) return null;
  const convo = await Conversation.findOne({ key: conversationKey(me, String(them._id)) }).lean<IConversation>();
  let messages: DirectMessageT[] = [];
  let more = false;
  if (convo) {
    const when = after ? { $gt: new Date(after) } : before ? { $lt: new Date(before) } : undefined;
    const found = await DirectMessage.find({ conversationId: convo._id, ...(when ? { createdAt: when } : {}) })
      .sort({ createdAt: after ? 1 : -1 })
      .limit(PAGE + 1)
      .lean<IDirectMessage[]>();
    more = !after && found.length > PAGE;
    const page = found.slice(0, PAGE);
    messages = (after ? page : page.reverse()).map((m) => toMessage(m, me));
    await Conversation.updateOne({ _id: convo._id }, { $set: { [`unread.${me}`]: 0 } });
  }
  const link = await follows(mine, them);
  return {
    person: personOf(them),
    messages,
    more,
    closed: await closedReason(mine, them, convo, link),
    blocked: Boolean(convo?.blockedBy?.some((b) => String(b) === me)),
    ...link,
  };
}

/** Writes to someone. Starts the conversation if it's the first message. */
export async function sendMessage(me: string, handle: string, raw: string): Promise<Outcome<DirectMessageT>> {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MESSAGE_MAX);
  if (!text) return fail("A message needs words.", 400);
  const [mine, them] = await Promise.all([User.findById(me).select(PERSON).lean<Person>(), personByHandle(handle)]);
  if (!mine) return fail("Not found", 404);
  if (!them?.handle) return fail("There’s nobody with that handle.", 404);
  const key = conversationKey(me, String(them._id));
  const existing = await Conversation.findOne({ key }).select("blockedBy").lean<IConversation>();
  const closed = await closedReason(mine, them, existing);
  if (closed) return fail(closed, closed === NEEDS_HANDLE ? 403 : 409);

  const now = new Date();
  const convo = await Conversation.findOneAndUpdate(
    { key },
    {
      // The filter's key goes into a new conversation by itself.
      $setOnInsert: { members: [mine._id, them._id].sort((a, b) => String(a).localeCompare(String(b))), blockedBy: [] },
      $set: { lastText: text.replace(/\s+/g, " ").slice(0, 200), lastFrom: mine._id, lastAt: now },
      $inc: { [`unread.${String(them._id)}`]: 1 },
    },
    { upsert: true, returnDocument: "after" }
  ).lean<IConversation>();
  if (!convo) return fail("That didn’t send. Try again.", 500);
  const message = await DirectMessage.create({ conversationId: convo._id, from: mine._id, text, createdAt: now });
  return { ok: true, value: toMessage(message, me) };
}

/** Stops (or lets back) someone's messages. */
export async function setBlocked(me: string, handle: string, blocked: boolean): Promise<Outcome<{ blocked: boolean }>> {
  const them = await personByHandle(handle);
  if (!them?.handle || !isObjectId(me) || String(them._id) === me) return fail("Not found", 404);
  const key = conversationKey(me, String(them._id));
  const mine = new Types.ObjectId(me);
  await Conversation.updateOne(
    { key },
    {
      ...(blocked ? { $addToSet: { blockedBy: mine } } : { $pull: { blockedBy: mine } }),
      $setOnInsert: { members: [mine, them._id].sort((a, b) => String(a).localeCompare(String(b))), lastAt: new Date(), lastText: "" },
    },
    { upsert: blocked }
  );
  return { ok: true, value: { blocked } };
}
