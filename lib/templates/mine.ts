import { Types } from "mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import type { OwnPageT } from "@/lib/types";
import { isoDay } from "@/lib/utils/dates";

/**
 * Every page layout the writer has made or copied, today's first, then the latest. Making or
 * copying a page never removes the one before: they all stay here to switch back to, and the
 * pages written with each keep their own questions and answers.
 */
export async function myPages(userId: string): Promise<OwnPageT[]> {
  const [docs, user, use] = await Promise.all([
    Template.find({ userId }).select("name fields clonedFrom isPublished updatedAt").sort({ updatedAt: -1 }).limit(60).lean(),
    User.findById(userId).select("activeTemplateId").lean(),
    Entry.aggregate<{ _id: Types.ObjectId; n: number; last: Date }>([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: "$templateId", n: { $sum: 1 }, last: { $max: "$date" } } },
    ]),
  ]);
  const active = user?.activeTemplateId ? String(user.activeTemplateId) : null;
  const written = new Map(use.map((u) => [String(u._id), u]));
  return docs
    .map((t) => {
      const id = String(t._id);
      const w = written.get(id);
      return {
        _id: id,
        name: t.name,
        questions: (t.fields ?? []).filter((f) => f.type !== "divider").length,
        active: id === active,
        fromGallery: Boolean(t.clonedFrom),
        published: Boolean(t.isPublished),
        written: w?.n ?? 0,
        lastWritten: w?.last ? isoDay(w.last) : null,
        updatedAt: new Date(t.updatedAt).toISOString(),
      };
    })
    .sort((a, b) => Number(b.active) - Number(a.active));
}
