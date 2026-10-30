import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Moment, REACTION_KINDS } from "@/lib/db/models/Moment";
import { Reaction } from "@/lib/db/models/Reaction";
import { handleError, jsonError, requireUser } from "@/lib/api";
import { checkLimit, limiters } from "@/lib/ratelimit/upstash";
import { isDuplicateKey } from "@/lib/social/db";
import { reactionCounts } from "@/lib/social/dto";
import { NEEDS_HANDLE, handleOf } from "@/lib/social/handles";
import { notify, unnotify } from "@/lib/social/notify";
import { ReactionSchema, parseBody } from "@/lib/social/schemas";
import { findVisibleMoment } from "@/lib/social/visibility";

/** Toggles one of the viewer's reactions on a moment. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ momentId: string }> }
) {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    const me = session.user.id;
    const { momentId } = await ctx.params;

    const limit = await checkLimit(limiters.reaction, `reaction:${me}`);
    if (!limit.ok) return jsonError("Too many reactions. Try again later.", 429);

    const { kind } = await parseBody(request, ReactionSchema);
    await connectDB();
    const moment = await findVisibleMoment(me, momentId);
    if (!moment) return jsonError("Not found", 404);

    const own = { momentId: moment._id, userId: me, kind };
    const count = `reactions.${kind}` as const;
    const notice = { userId: moment.userId, actorId: me, kind: "reaction", momentId: moment._id } as const;
    const isAuthor = String(moment.userId) === me;

    const { deletedCount } = await Reaction.deleteOne(own);
    if (deletedCount === 1) {
      await Moment.updateOne({ _id: moment._id, [count]: { $gt: 0 } }, { $inc: { [count]: -1 } });
      if (!isAuthor) {
        // The notification shows their latest reaction, and goes once they've taken back the last.
        const latest = await Reaction.findOne({ momentId: moment._id, userId: me })
          .sort({ createdAt: -1 })
          .select("kind")
          .lean();
        await (latest ? notify(notice, { reaction: latest.kind }) : unnotify(notice));
      }
    } else {
      if (!(await handleOf(me))) return jsonError(NEEDS_HANDLE, 403);
      let created = false;
      try {
        await Reaction.create(own);
        created = true;
      } catch (err) {
        if (!isDuplicateKey(err)) throw err;
      }
      if (created) {
        await Promise.all([
          Moment.updateOne({ _id: moment._id }, { $inc: { [count]: 1 } }),
          notify(notice, { reaction: kind }),
        ]);
      }
    }

    const [fresh, mine] = await Promise.all([
      Moment.findById(moment._id).select("reactions").lean(),
      Reaction.distinct("kind", { momentId: moment._id, userId: me }),
    ]);
    return NextResponse.json({
      reactions: reactionCounts(fresh?.reactions),
      mine: REACTION_KINDS.filter((k) => mine.includes(k)),
    });
  } catch (err) {
    return handleError(err);
  }
}
