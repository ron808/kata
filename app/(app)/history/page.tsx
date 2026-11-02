import Link from "next/link";
import { Types } from "mongoose";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { Thread } from "@/lib/db/models/Thread";
import { CompanionMessage } from "@/lib/db/models/CompanionMessage";
import { namesFor } from "@/lib/companion/naming";
import { AppPage, EmptyNote, PageHeader } from "@/components/shared/AppPage";
import { buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { PageList } from "@/components/dashboard/RecentPages";
import { hueForTag, threadTagHues } from "@/components/entry/hue";
import { formatDate, isoDay } from "@/lib/utils/dates";
import { dateToDay, todayIn, validTimeZone } from "@/lib/companion/time";
import { User } from "@/lib/db/models/User";
import type { Entry as EntryT } from "@/lib/types";

const PER_PAGE = 20;
const MAX_CHIPS = 24;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export default async function HistoryPage(props: {
  searchParams: Promise<{ tag?: string | string[]; page?: string | string[] }>;
}) {
  const params = await props.searchParams;
  const tag = first(params.tag)?.trim().replace(/^#+/, "").toLowerCase() || undefined;
  const pageNum = Math.max(1, Math.floor(Number(first(params.page)) || 1));
  const session = await auth();
  const userId = session!.user.id;
  const owner = new Types.ObjectId(userId);
  await connectDB();

  const filter: Record<string, unknown> = { userId };
  if (tag) filter.tags = tag;
  const me = await User.findById(userId).select("timezone").lean();
  const today = todayIn(validTimeZone(me?.timezone));

  const [entries, total, tagCounts, kataTagRows, threads, todayEntry, { name }] = await Promise.all([
    Entry.find(filter)
      .select("date wordCount tags fields")
      .sort({ date: -1 })
      .skip((pageNum - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean(),
    Entry.countDocuments(filter),
    // Every tag with its page count, for the filter. Aggregations don't cast: match a real ObjectId.
    Entry.aggregate<{ _id: string; count: number }>([
      { $match: { userId: owner } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 200 },
    ]),
    // Tags that came from answering Kata's questions (fieldId kata:<tag>:<id>).
    Entry.aggregate<{ _id: string }>([
      { $match: { userId: owner, "fields.fieldId": { $regex: /^kata:/ } } },
      { $unwind: "$fields" },
      { $match: { "fields.fieldId": { $regex: /^kata:/ } } },
      { $group: { _id: { $arrayElemAt: [{ $split: ["$fields.fieldId", ":"] }, 1] } } },
    ]),
    Thread.find({ userId, archived: false }).select("title tags hue").sort({ lastTouchedAt: -1 }).limit(200).lean(),
    Entry.exists({ userId, date: today }),
    namesFor(userId),
  ]);

  const rows: EntryT[] = entries.map((e) => ({
    _id: String(e._id),
    date: isoDay(e.date),
    wordCount: e.wordCount ?? 0,
    tags: e.tags ?? [],
    fields: (e.fields ?? []).map((f) => ({
      fieldId: f.fieldId,
      type: f.type as EntryT["fields"][number]["type"],
      label: f.label,
      value: f.value as EntryT["fields"][number]["value"],
    })),
  }));

  // Month totals for the months on this page (all of each month, not just the rows shown),
  // and Kata's mood check for each day shown.
  const days = rows.map((r) => r.date);
  const oldest = entries.at(-1)?.date;
  const newest = entries[0]?.date;
  const [monthTotals, checkIns] = await Promise.all([
    oldest && newest
      ? Entry.aggregate<{ _id: { y: number; m: number }; pages: number; words: number }>([
          {
            $match: {
              ...(tag ? { tags: tag } : {}),
              userId: owner,
              date: {
                $gte: new Date(Date.UTC(oldest.getUTCFullYear(), oldest.getUTCMonth(), 1)),
                $lt: new Date(Date.UTC(newest.getUTCFullYear(), newest.getUTCMonth() + 1, 1)),
              },
            },
          },
          {
            $group: {
              _id: { y: { $year: "$date" }, m: { $month: "$date" } },
              pages: { $sum: 1 },
              words: { $sum: "$wordCount" },
            },
          },
        ])
      : Promise.resolve([]),
    days.length
      ? CompanionMessage.find({ userId, from: "you", mood: { $ne: null }, day: { $in: days } })
          .sort({ createdAt: 1 })
          .select("day mood")
          .lean()
      : Promise.resolve([]),
  ]);
  const moods: Record<string, number | null> = {};
  for (const c of checkIns) moods[c.day] = c.mood ?? null;

  const threadHues = threadTagHues(threads);

  // Filter chips: the most used tags, always including Kata's question tags and the current one.
  // Kata's question tags come first, next to their legend; then the rest by use.
  const kataTags = new Set(kataTagRows.map((r) => r._id).filter(Boolean));
  const counts = new Map(tagCounts.map((t) => [t._id, t.count]));
  const fromKata = tagCounts.filter((t) => kataTags.has(t._id)).map((t) => t._id);
  const chips = [...fromKata, ...tagCounts.filter((t) => !kataTags.has(t._id)).map((t) => t._id)].slice(
    0,
    Math.max(MAX_CHIPS, fromKata.length)
  );
  if (tag && !chips.includes(tag)) chips.push(tag);

  type Month = { key: string; label: string; pages: number; words: number; entries: EntryT[] };
  const months: Month[] = [];
  for (const r of rows) {
    const d = new Date(r.date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const last = months.at(-1);
    if (last?.key === key) {
      last.entries.push(r);
      continue;
    }
    const sum = monthTotals.find((m) => m._id.y === d.getUTCFullYear() && m._id.m === d.getUTCMonth() + 1);
    months.push({
      key,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      pages: sum?.pages ?? 0,
      words: sum?.words ?? 0,
      entries: [r],
    });
  }

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => {
    const q = new URLSearchParams({ ...(tag ? { tag } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString();
    return q ? `/history?${q}` : "/history";
  };
  const isKata = tag ? kataTags.has(tag) : false;
  const showTodayNudge = !tag && pageNum === 1 && !todayEntry && total > 0;

  return (
    <AppPage>
      <PageHeader
        kicker="Pages"
        title={tag ? <>#{tag}</> : "Your pages"}
        lede={
          tag
            ? `${plural(total, "page")} filed under #${tag}${isKata ? `, including answers to ${name}’s questions` : ""}.`
            : total
              ? `${plural(total, "page")} so far. No one else on Kata can read ${total === 1 ? "it" : "them"}.`
              : "Every page you write lands here, newest first. No one else on Kata can read them."
        }
      />

      {chips.length > 0 ? (
        <nav aria-label="Filter by tag" className="mt-8">
          <ul className="no-scrollbar relative -mx-margin flex snap-x scroll-px-margin gap-2.5 overflow-x-auto px-margin pb-2 pt-1 sm:flex-wrap sm:overflow-visible">
            <li className="snap-start">
              <Link href="/history" aria-current={!tag ? "page" : undefined} className="chip">
                All pages
              </Link>
            </li>
            {chips.map((t) => {
              const on = tag === t;
              const fromKata = kataTags.has(t);
              return (
                <li key={t} className="snap-start">
                  <Link
                    href={`/history?tag=${encodeURIComponent(t)}`}
                    aria-current={on ? "page" : undefined}
                    className={`chip ${on ? "[--seal-cut:var(--sun)]" : "[--seal-cut:var(--surface)]"}`}
                  >
                    <span aria-hidden data-hue={hueForTag(t, threadHues)} className="h-3 w-3 rounded-full border-2 border-edge bg-hue" />
                    #{t}
                    <span className={`tabular-nums ${on ? "" : "text-ink/65"}`}>{counts.get(t) ?? 0}</span>
                    {fromKata ? (
                      <>
                        <Seal size={16} className="-mr-1" />
                        <span className="sr-only">, from {name}’s questions</span>
                      </>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {kataTags.size > 0 ? (
            <p className="mt-2 inline-flex items-center gap-2 text-[0.8125rem] text-ink/65">
              <Seal size={14} cut="ground" />
              Tags from answering {name}’s questions
            </p>
          ) : null}
        </nav>
      ) : null}

      {showTodayNudge ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-dashed border-edge/50 px-5 py-4 sm:px-6">
          <p className="min-w-0">
            <span className="block font-display text-[1.35rem] leading-tight">{formatDate(today, "long", "UTC")}</span>
            <span className="text-[0.9375rem] text-ink/70">Today’s page is still blank.</span>
          </p>
          <Link href="/entry/new?day=today" className={buttonClass({ variant: "secondary" })}>
            <Icon name="pen" className="h-4 w-4" />
            Write it
          </Link>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-10">
          {tag ? (
            <EmptyNote
              action={
                <Link href="/history" className={buttonClass({ variant: "secondary" })}>
                  Show all pages
                </Link>
              }
            >
              {pageNum > 1 ? `There are only ${plural(pages, "page")} of results.` : `No pages filed under #${tag} yet.`}
            </EmptyNote>
          ) : pageNum > 1 ? (
            <EmptyNote
              action={
                <Link href="/history" className={buttonClass({ variant: "secondary" })}>
                  Back to the newest
                </Link>
              }
            >
              Nothing this far back yet.
            </EmptyNote>
          ) : (
            <EmptyNote action={<Link href="/entry/new" className={buttonClass()}>Write your first page</Link>}>
              No pages yet. Today’s is waiting, and it can be a few lines.
            </EmptyNote>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {months.map((m) => (
            <section key={m.key} aria-labelledby={`month-${m.key}`}>
              {/* Sticky month header: the next month pushes it off. */}
              <div className="sticky top-14 z-10 -mx-margin flex items-baseline justify-between gap-4 bg-ground/95 px-margin pb-3 pt-4 backdrop-blur-sm lg:top-0">
                <h2 id={`month-${m.key}`} className="font-display text-display-s">
                  {m.label}
                </h2>
                <p className="shrink-0 text-[0.875rem] font-medium tabular-nums text-ink/70">
                  {plural(m.pages, "page")}
                  <span className="max-xs:hidden"> · {plural(m.words, "word")}</span>
                </p>
              </div>
              <div className="card overflow-hidden">
                <PageList entries={m.entries} today={dateToDay(today)} showMonth={false} moods={moods} tagHues={threadHues} />
              </div>
            </section>
          ))}
        </div>
      )}

      {pages > 1 && rows.length > 0 ? (
        <nav aria-label="More pages" className="mt-12 flex items-center justify-between gap-3">
          {pageNum > 1 ? (
            <Link href={href(pageNum - 1)} className={buttonClass({ variant: "secondary" })} rel="prev">
              <Icon name="arrow-left" className="h-4 w-4" />
              Newer
            </Link>
          ) : (
            <span />
          )}
          <p className="text-[0.875rem] font-medium tabular-nums text-ink/70">
            {pageNum} of {pages}
          </p>
          {pageNum < pages ? (
            <Link href={href(pageNum + 1)} className={buttonClass({ variant: "secondary" })} rel="next">
              Older
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </AppPage>
  );
}
