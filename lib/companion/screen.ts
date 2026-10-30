import { Types } from "mongoose";
import { Moment } from "@/lib/db/models/Moment";
import { User } from "@/lib/db/models/User";
import { isObjectId } from "@/lib/social/db";
import { hueOf } from "@/lib/social/dto";
import { followingIds, friendsAmong } from "@/lib/social/visibility";

/** A post the writer has in view, numbered the way the model sees it. */
export interface ScreenItem {
  n: number;
  momentId: string;
  name: string;
  handle: string;
  hue: number;
  isMine: boolean;
  kind: string;
  text: string;
  replies: number;
  at: Date;
}

/** Each post costs tokens on every message that mentions the screen, so only the first few count. */
const MAX_ITEMS = 6;

/**
 * The posts on the writer's screen, from the ids their page sent, in screen order. Loaded here
 * rather than read off the page, so it's only what they may see, in the words actually posted.
 */
export async function screenOf(viewerId: string, ids: string[]): Promise<ScreenItem[]> {
  const wanted = [...new Set(ids.filter(isObjectId))].slice(0, MAX_ITEMS);
  if (!wanted.length) return [];
  const moments = await Moment.find({ _id: { $in: wanted } })
    .select("userId text kind visibility replyCount createdAt")
    .lean();
  const authorIds = [...new Set(moments.map((m) => String(m.userId)))].map((id) => new Types.ObjectId(id));
  const following = new Set((await followingIds(viewerId)).map(String));
  const friends = new Set((await friendsAmong(viewerId, authorIds.filter((id) => following.has(String(id))))).map(String));
  const visible = moments.filter((m) => m.visibility === "public" || String(m.userId) === viewerId || friends.has(String(m.userId)));
  const authors = new Map(
    (await User.find({ _id: { $in: visible.map((m) => m.userId) } }).select("name handle hue").lean()).map((u) => [String(u._id), u])
  );
  const byId = new Map(visible.map((m) => [String(m._id), m]));
  return wanted
    .flatMap((id) => {
      const m = byId.get(id);
      const a = m ? authors.get(String(m.userId)) : undefined;
      if (!m || !a?.handle) return [];
      return [
        {
          momentId: id,
          name: a.name,
          handle: a.handle,
          hue: hueOf(a),
          isMine: String(m.userId) === viewerId,
          kind: m.kind,
          text: m.text,
          replies: m.replyCount ?? 0,
          at: m.createdAt,
        },
      ];
    })
    .map((item, i) => ({ ...item, n: i + 1 }));
}

/** The screen as a few lines for the model, with the one they're on marked. */
export function screenLines(items: ScreenItem[], here?: string | null): string {
  return items
    .map((s) => {
      const who = s.isMine ? "Their own post" : `${s.name} (@${s.handle})`;
      const text = s.text.replace(/\s+/g, " ").slice(0, 220);
      const replies = s.replies ? ` · ${s.replies} ${s.replies === 1 ? "reply" : "replies"}` : "";
      return `[${s.n}] ${who} · ${s.kind}: “${text}”${replies}${s.momentId === here && items.length > 1 ? " · the one they're on" : ""}`;
    })
    .join("\n");
}

// Words that point at what's on screen: "this one", "the one I'm on", "reply to that".
const POINTS =
  /\b(?:this|these|those|that one|the one|which one|i'?m on|i am on|on (?:my |the )?screen|right now|looking at|see|posts?|comments?|repl(?:y|ies)|respond|write back|what do you think|thoughts on)\b/i;

/**
 * Whether the posts in view belong in this turn, since each costs tokens: the words point at
 * them, name someone who wrote one ("Theo's post"), or carry on from Maru's drafts for one.
 */
export function aboutScreen(said: string, items: ScreenItem[], following: boolean): boolean {
  if (!items.length) return false;
  if (POINTS.test(said) || following) return true;
  const words = new Set(said.toLowerCase().match(/[\p{L}\p{N}_]+/gu)?.map((w) => w.replace(/s$/, "")) ?? []);
  const named = (w: string) => words.has(w.toLowerCase().replace(/s$/, ""));
  return items.some((s) => !s.isMine && (named(s.handle) || named(s.name.split(/\s+/)[0])));
}
