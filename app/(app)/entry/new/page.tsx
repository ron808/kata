import { redirect, unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { Entry } from "@/lib/db/models/Entry";
import { Thread } from "@/lib/db/models/Thread";
import { contextFor, type EngineCtx } from "@/lib/companion/engine";
import { ensurePage } from "@/lib/templates/mine";
import { pageState, questionsFor } from "@/lib/companion/load";
import { isDayOff } from "@/lib/questions/daily";
import { addDays, dayToDate } from "@/lib/companion/time";
import { formatDate } from "@/lib/utils/dates";
import { EntryForm } from "@/components/entry/EntryForm";
import { buildAsks, type Ask, type ThreadLook } from "@/components/entry/asks";
import { threadTagHues } from "@/components/entry/hue";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import type { Template as TemplateT, EntryField, DailyQuestion } from "@/lib/types";

/** Kata's questions for this page. The page still works without them if the companion can't answer. */
async function pageQuestions(ctx: EngineCtx, past: boolean): Promise<DailyQuestion[]> {
  try {
    return await questionsFor(ctx, past);
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

export default async function NewEntryPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { day: asked } = await searchParams;

  let template: TemplateT | null = null;
  let initialFields: EntryField[] | undefined;
  let entryId: string | undefined;
  let dbError: string | null = null;
  let pageNumber = 1;
  let asks: Ask[] = [];
  let tagHues: Record<string, number> = {};
  let day = "";
  let past = false;
  let hour = 12;
  let offDay = false;
  let other: { href: string; label: string } | null = null;

  try {
    const ctx = await contextFor(userId);
    hour = ctx.hour;
    const page = await pageState(ctx);
    const yesterday = addDays(ctx.day, -1);
    day = asked === "today" ? ctx.day : asked === "yesterday" ? yesterday : page.day;
    past = day !== ctx.day;
    offDay = isDayOff(ctx.user.role, day);
    other = past
      ? { href: "/entry/new?day=today", label: "Write about today instead" }
      : page.yesterdayBlank
        ? { href: "/entry/new?day=yesterday", label: "Fill in yesterday" }
        : null;
    const [existing, questions, threads] = await Promise.all([
      Entry.findOne({ userId, date: dayToDate(day) }).lean(),
      pageQuestions(ctx, past),
      threadsOf(userId),
    ]);
    pageNumber = (ctx.user.totalEntries ?? 0) + (existing ? 0 : 1);
    // Someone who skipped setup still gets a page to write on.
    const tpl = await ensurePage(userId);
    if (tpl) {
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
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Error) dbError = err.message;
  }

  if (!template) return <DbNotConfigured error={dbError} />;

  return (
    <EntryForm
      key={day}
      template={template}
      asks={asks}
      tagHues={tagHues}
      initialFields={initialFields}
      entryId={entryId}
      date={day}
      past={past}
      hour={hour}
      offDay={offDay}
      other={other}
      weekday={formatDate(dayToDate(day), "weekday", "UTC")}
      monthDay={formatDate(dayToDate(day), "monthDay", "UTC")}
      pageNumber={pageNumber}
    />
  );
}
