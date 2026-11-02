import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { Template } from "@/lib/db/models/Template";
import { Thread } from "@/lib/db/models/Thread";
import { User } from "@/lib/db/models/User";
import { CompanionMessage } from "@/lib/db/models/CompanionMessage";
import { namesFor } from "@/lib/companion/naming";
import { isKataFieldId, parseKataFieldId } from "@/lib/questions/daily";
import { suggestHandle } from "@/lib/social/handles";
import { FieldRenderer } from "@/components/entry/FieldRenderer";
import { FieldPrompt } from "@/components/entry/FieldPrompt";
import { Prose } from "@/components/entry/fields/LongTextField";
import { MoodDots, moodLabel } from "@/components/entry/fields/meters";
import { ShareLine } from "@/components/entry/ShareLine";
import { passagesOf } from "@/components/entry/passages";
import { hueForTag, threadTagHues } from "@/components/entry/hue";
import { TagHues } from "@/components/entry/TagHues";
import { KataMark } from "@/components/shared/Avatar";
import { buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { isoDay } from "@/lib/utils/dates";
import { addDays, localDay, validTimeZone } from "@/lib/companion/time";
import type { EntryField, TemplateField } from "@/lib/types";

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

function isAnswered(f: EntryField): boolean {
  if (Array.isArray(f.value)) return f.value.length > 0;
  if (typeof f.value === "string") return f.value.trim().length > 0;
  return f.value !== null && f.value !== undefined;
}

/** Answered fields in order, with a divider kept only when something under it was answered. */
function answeredInOrder(fields: EntryField[]): EntryField[] {
  const out: EntryField[] = [];
  let divider: EntryField | null = null;
  for (const f of fields) {
    if (f.type === "divider") divider = f;
    else if (isAnswered(f)) {
      if (divider) out.push(divider);
      divider = null;
      out.push(f);
    }
  }
  return out;
}

export default async function ViewEntryPage(props: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isValidObjectId(entryId)) notFound();
  const userId = session.user.id;

  await connectDB();
  const entry = await Entry.findOne({ _id: entryId, userId }).lean();
  if (!entry) notFound();

  const fields: EntryField[] = (entry.fields ?? []).map((f) => ({
    fieldId: f.fieldId,
    type: f.type as EntryField["type"],
    label: f.label,
    value: f.value as EntryField["value"],
  }));
  const kataFields = fields.filter((f) => isKataFieldId(f.fieldId));
  const pageFields = fields.filter((f) => !isKataFieldId(f.fieldId));
  const day = isoDay(entry.date);

  const [template, older, newer, pageNumber, user, threads, checkIn, { name }] = await Promise.all([
    Template.findById(entry.templateId).lean(),
    Entry.findOne({ userId, date: { $lt: entry.date } }).sort({ date: -1 }).select("date").lean(),
    Entry.findOne({ userId, date: { $gt: entry.date } }).sort({ date: 1 }).select("date").lean(),
    Entry.countDocuments({ userId, date: { $lte: entry.date } }),
    User.findById(userId).select("handle name timezone").lean(),
    Thread.find({ userId, archived: false }).select("title tags hue").sort({ lastTouchedAt: -1 }).limit(200).lean(),
    // The mood check with Kata that day, for pages whose template has no mood field.
    CompanionMessage.findOne({ userId, from: "you", mood: { $ne: null }, day }).sort({ createdAt: -1 }).select("mood").lean(),
    namesFor(userId),
  ]);

  // A thread's tag (as Kata files its questions) carries the thread's hue.
  const threadHues = threadTagHues(threads);
  const threadTitles: Record<string, string> = Object.fromEntries(threads.map((t) => [String(t._id), t.title]));
  const threadHueById: Record<string, number> = Object.fromEntries(threads.map((t) => [String(t._id), t.hue ?? 0]));

  const handle = user?.handle ?? null;
  const suggested = handle || !user ? null : await suggestHandle(user.name ?? "").catch(() => null);

  const date = new Date(entry.date);
  const today = localDay(validTimeZone(user?.timezone));
  const isToday = day === today;
  // Yesterday's page is still open: it's the one people fill in over breakfast.
  const openDay = isToday ? "today" : day === addDays(today, -1) ? "yesterday" : null;
  const moodField = pageFields.find((f) => f.type === "mood_slider" && typeof f.value === "number");
  const mood = (moodField?.value as number | undefined) ?? checkIn?.mood ?? null;
  const label = moodLabel(mood);
  const tags = entry.tags ?? [];
  const passages = passagesOf([...pageFields, ...kataFields]);
  const shown = answeredInOrder(pageFields);
  const blank = pageFields.filter((f) => f.type !== "divider" && !isAnswered(f));

  const toField = (f: EntryField, i: number): TemplateField => {
    const tpl = template?.fields.find((tf) => tf.id === f.fieldId);
    return tpl
      ? {
          id: tpl.id,
          type: tpl.type,
          label: tpl.label,
          required: tpl.required,
          order: tpl.order,
          config: (tpl.config as Record<string, unknown>) ?? {},
        }
      : { id: f.fieldId, type: f.type, label: f.label, required: false, order: i, config: {} };
  };

  return (
    <div className="mx-auto w-full max-w-[48rem] px-margin pb-24 pt-[clamp(1.25rem,4vw,3rem)]">
      <nav aria-label="Page actions" className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/history" className={buttonClass({ variant: "quiet", className: "-ml-3" })}>
          <Icon name="arrow-left" className="h-4 w-4" />
          All pages
        </Link>
        {openDay ? (
          <Link href={`/entry/new?day=${openDay}`} className={buttonClass({ variant: "secondary" })}>
            <Icon name="pen" className="h-4 w-4" />
            Keep writing
          </Link>
        ) : null}
      </nav>

      <TagHues hues={threadHues}>
        <article aria-labelledby="page-title" className="card relative mt-5 px-[clamp(1.25rem,5vw,3.5rem)] pb-16 pt-[clamp(1.75rem,5vw,3rem)]">
          <header>
            <p className="text-[0.9375rem] font-medium text-ink/70">
              Page {pageNumber.toLocaleString("en-US")} · {fmt(date, { weekday: "long" })}
            </p>
            <h1 id="page-title" className="mt-2 font-display text-display-m">
              {fmt(date, { month: "long", day: "numeric" })}
              <span className="text-ink/55">, {date.getUTCFullYear()}</span>
            </h1>
            <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem] text-ink/70">
              <li className="font-medium">
                <span className="font-display text-[1.35rem] tabular-nums text-ink">{(entry.wordCount ?? 0).toLocaleString("en-US")}</span>{" "}
                {entry.wordCount === 1 ? "word" : "words"}
              </li>
              {label && mood ? (
                <li className="inline-flex items-center gap-2 font-medium">
                  <MoodDots value={mood} size={6} className="text-ink" />
                  {label}
                  <span className="sr-only"> mood</span>
                </li>
              ) : null}
              {tags.length ? (
                <li className="min-w-0 max-w-full">
                  <ul aria-label="Tags" className="flex flex-wrap gap-x-1.5">
                    {tags.map((t) => (
                      <li key={t} className="max-w-full">
                        <Link
                          href={`/history?tag=${encodeURIComponent(t)}`}
                          className="inline-flex min-h-11 max-w-full items-center rounded-full"
                          aria-label={`Pages tagged ${t}`}
                        >
                          <span data-hue={hueForTag(t, threadHues)} className="tag max-w-full">
                            <span className="truncate">#{t}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
            </ul>
          </header>

          <div className="rule mt-6 space-y-10 border-t-2 pt-9">
            {shown.length === 0 ? (
              <p className="text-ink/70">{kataFields.length ? `Only ${name}’s questions were answered on this page.` : "Nothing was written on this page."}</p>
            ) : null}
            {shown.map((f, i) => {
              const field = toField(f, i);
              if (field.type === "divider") {
                return <FieldRenderer key={f.fieldId} field={field} value={null} readOnly />;
              }
              return (
                <div key={f.fieldId}>
                  <FieldPrompt as="h2" className="!text-ink/75">
                    {field.label}
                  </FieldPrompt>
                  <div className="mt-3">
                    <FieldRenderer field={field} value={f.value} readOnly />
                  </div>
                </div>
              );
            })}
            {blank.length > 0 ? (
              <p className="text-[0.9375rem] text-ink/65">
                <span className="font-semibold">Left blank:</span> {blank.map((f) => f.label).join(" · ")}
              </p>
            ) : null}
          </div>

          {kataFields.length > 0 ? (
            <section aria-labelledby="kata-asked" className="rule mt-12 border-t-2 pt-9">
              <div className="flex items-center gap-3">
                <KataMark size={34} cut="surface" />
                <h2 id="kata-asked" className="font-display text-display-s">
                  {name} asked
                </h2>
              </div>
              <ul className="mt-6 grid grid-cols-1 gap-4">
                {kataFields.map((f) => {
                  const parsed = parseKataFieldId(f.fieldId);
                  const tag = parsed?.tag ?? "kata";
                  const thread = parsed?.threadId ? threadTitles[parsed.threadId] : undefined;
                  const own = parsed?.threadId ? threadHueById[parsed.threadId] : undefined;
                  const hue = own !== undefined ? own % 8 : hueForTag(tag, threadHues);
                  return (
                    <li key={f.fieldId} data-hue={hue} className="well bg-tint px-5 pb-6 pt-5 sm:px-6">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Link href={`/history?tag=${encodeURIComponent(tag)}`} className="inline-flex min-h-11 max-w-full items-center rounded-full">
                          <span className="tag max-w-full"><span className="truncate">#{tag}</span></span>
                        </Link>
                        {thread ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-semibold text-deep">
                            <Icon name="threads" className="h-4 w-4" />
                            <span className="truncate">{thread}</span>
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 font-display text-prompt text-ink">{f.label}</h3>
                      {typeof f.value === "string" && f.value.trim() ? (
                        <Prose text={f.value} className="mt-3" />
                      ) : (
                        <p className="mt-3 text-[0.9375rem] text-deep">Left blank</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <footer className="rule mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t-2 pt-7 pr-16 sm:pr-24">
            <ShareLine entryId={String(entry._id)} passages={passages} tags={tags.map((t) => ({ tag: t, hue: hueForTag(t, threadHues) }))} handle={handle} suggestedHandle={suggested} />
            <p className="inline-flex items-center gap-2 text-[0.875rem] text-ink/65">
              <Icon name="lock" className="h-4 w-4" />
              No one else on Kata can read this page.
            </p>
          </footer>

          <Seal size={84} cut="surface" title="Written" className="absolute -bottom-6 right-[clamp(0.75rem,3vw,2rem)] -rotate-[9deg]" />
        </article>
      </TagHues>

      <nav aria-label="More pages" className="mt-12 grid grid-cols-2 gap-3 sm:gap-4">
        {older ? (
          <Link
            href={`/entry/${older._id}`}
            className="press group flex min-h-20 items-center gap-3 rounded-lg border-2 border-edge bg-surface px-4 py-4 transition-[transform,box-shadow] duration-300 sm:gap-4 sm:px-5"
          >
            <Icon name="arrow-left" className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span className="min-w-0">
              <span className="block text-[0.875rem] text-ink/65">Older page</span>
              <span className="block truncate font-display text-[clamp(1.05rem,0.9rem+0.8vw,1.35rem)] leading-tight">
                {fmt(new Date(older.date), { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </span>
          </Link>
        ) : (
          <p className="flex min-h-20 items-center rounded-lg border-2 border-dashed border-edge/40 px-4 text-[0.9375rem] text-ink/65 sm:px-5">
            This is your first page.
          </p>
        )}
        {newer ? (
          <Link
            href={`/entry/${newer._id}`}
            className="press group flex min-h-20 items-center justify-end gap-3 rounded-lg border-2 border-edge bg-surface px-4 py-4 text-right transition-[transform,box-shadow] duration-300 sm:gap-4 sm:px-5"
          >
            <span className="min-w-0">
              <span className="block text-[0.875rem] text-ink/65">Newer page</span>
              <span className="block truncate font-display text-[clamp(1.05rem,0.9rem+0.8vw,1.35rem)] leading-tight">
                {fmt(new Date(newer.date), { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </span>
            <Icon name="arrow" className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        ) : isToday ? null : (
          <Link
            href="/entry/new?day=today"
            className="press group flex min-h-20 items-center justify-end gap-3 rounded-lg border-2 border-edge bg-surface px-4 py-4 text-right transition-[transform,box-shadow] duration-300 sm:gap-4 sm:px-5"
          >
            <span className="min-w-0">
              <span className="block text-[0.875rem] text-ink/65">Today</span>
              <span className="block truncate font-display text-[clamp(1.05rem,0.9rem+0.8vw,1.35rem)] leading-tight">Write today’s page</span>
            </span>
            <Icon name="arrow" className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        )}
      </nav>
    </div>
  );
}
