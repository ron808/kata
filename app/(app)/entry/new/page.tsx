import { redirect, unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Template } from "@/lib/db/models/Template";
import { Entry } from "@/lib/db/models/Entry";
import { Thread } from "@/lib/db/models/Thread";
import { questionsFor } from "@/lib/companion/load";
import { formatDate, todayUtcMidnight, isoDay } from "@/lib/utils/dates";
import { EntryForm } from "@/components/entry/EntryForm";
import { buildAsks, type Ask, type ThreadLook } from "@/components/entry/asks";
import { threadTagHues } from "@/components/entry/hue";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import type { Template as TemplateT, EntryField, DailyQuestion } from "@/lib/types";

/** Today's questions from Kata. The page still works without them if the companion can't answer. */
async function todaysQuestions(userId: string): Promise<DailyQuestion[]> {
  try {
    return await questionsFor(userId);
  } catch (err) {
    unstable_rethrow(err);
    console.error("entry:questions", err);
    return [];
  }
}

/** The writer's threads, for each question's thread title and the colour of tags threads own. */
async function threadsOf(userId: string) {
  try {
    return await Thread.find({ userId })
      .select("title tags hue archived")
      .sort({ lastTouchedAt: -1 })
      .limit(300)
      .lean();
  } catch (err) {
    unstable_rethrow(err);
    return [];
  }
}

export default async function NewEntryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  let template: TemplateT | null = null;
  let initialFields: EntryField[] | undefined;
  let entryId: string | undefined;
  let dbError: string | null = null;
  let needsOnboarding = false;
  let pageNumber = 1;
  let asks: Ask[] = [];
  let tagHues: Record<string, number> = {};

  try {
    await connectDB();
    const today = todayUtcMidnight();
    // User, today's entry and Kata's questions don't depend on each other: fetch in parallel.
    // The template lookup must wait for the user (it depends on activeTemplateId).
    const [user, existing, questions, threads] = await Promise.all([
      User.findById(userId).select("activeTemplateId totalEntries").lean(),
      Entry.findOne({ userId, date: today }).lean(),
      todaysQuestions(userId),
      threadsOf(userId),
    ]);
    pageNumber = (user?.totalEntries ?? 0) + (existing ? 0 : 1);
    if (!user?.activeTemplateId) {
      needsOnboarding = true;
    } else {
      const tpl = await Template.findById(user.activeTemplateId).lean();
      if (!tpl) {
        needsOnboarding = true;
      } else {
        template = {
          _id: String(tpl._id),
          name: tpl.name,
          description: tpl.description,
          isPublished: tpl.isPublished,
          publishedSlug: tpl.publishedSlug,
          cloneCount: tpl.cloneCount,
          clonedFrom: tpl.clonedFrom ? String(tpl.clonedFrom) : null,
          tags: tpl.tags,
          fields: (tpl.fields ?? []).map((f) => ({
            id: f.id,
            type: f.type,
            label: f.label,
            required: f.required,
            order: f.order,
            config: (f.config as Record<string, unknown>) ?? {},
          })),
        };
        if (existing) {
          initialFields = (existing.fields ?? []).map((f) => ({
            fieldId: f.fieldId,
            type: f.type as EntryField["type"],
            label: f.label,
            value: f.value as EntryField["value"],
          }));
          entryId = String(existing._id);
        }
        const looks: Record<string, ThreadLook> = Object.fromEntries(
          threads.map((t) => [String(t._id), { title: t.title, hue: t.hue ?? 0 }])
        );
        tagHues = threadTagHues(threads.filter((t) => !t.archived));
        asks = buildAsks(questions, initialFields, looks, tagHues);
      }
    }
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Error) dbError = err.message;
  }

  if (needsOnboarding) redirect("/onboarding");
  if (!template) return <DbNotConfigured error={dbError} />;

  return (
    <EntryForm
      template={template}
      asks={asks}
      tagHues={tagHues}
      initialFields={initialFields}
      entryId={entryId}
      date={isoDay(todayUtcMidnight())}
      weekday={formatDate(new Date(), "weekday", "UTC")}
      monthDay={formatDate(new Date(), "monthDay", "UTC")}
      pageNumber={pageNumber}
    />
  );
}
