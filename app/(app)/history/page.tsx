import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { formatShortDate } from "@/lib/utils/dates";

export default async function HistoryPage(props: {
  searchParams: Promise<{ tag?: string; page?: string }>;
}) {
  const { tag, page = "1" } = await props.searchParams;
  const session = await auth();
  await connectDB();
  const pageNum = Math.max(1, Number(page) || 1);
  const limit = 20;

  const filter: Record<string, unknown> = { userId: session!.user.id };
  if (tag) filter.tags = tag;

  const entries = await Entry.find(filter)
    .sort({ date: -1 })
    .skip((pageNum - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Entry.countDocuments(filter);

  // Get all unique tags for filter UI
  const allTagsAgg = await Entry.aggregate([
    { $match: { userId: session!.user.id } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
      <header>
        <div className="text-xs uppercase tracking-widest text-text-muted font-mono">
          History
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          {tag ? `Tagged "${tag}"` : "All entries"}
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
        </p>
      </header>

      {allTagsAgg.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/history"
            className={`text-xs rounded-md border px-2 py-0.5 transition-colors ${
              !tag
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-bg-surface text-text-secondary hover:border-border-strong"
            }`}
          >
            All
          </Link>
          {allTagsAgg.map((t) => (
            <Link
              key={t._id}
              href={`/history?tag=${encodeURIComponent(t._id)}`}
              className={`text-xs rounded-md border px-2 py-0.5 font-mono transition-colors ${
                tag === t._id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-bg-surface text-text-secondary hover:border-border-strong"
              }`}
            >
              #{t._id} <span className="text-text-muted">{t.count}</span>
            </Link>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-surface/50 p-12 text-center text-text-muted">
          No entries yet. Start with{" "}
          <Link href="/entry/new" className="text-accent">
            today
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-2">
          {entries.map((e) => {
            const longText = e.fields.find(
              (f) => f.type === "long_text" && typeof f.value === "string" && f.value
            );
            const preview =
              typeof longText?.value === "string"
                ? longText.value.slice(0, 140)
                : "—";
            return (
              <Link
                key={String(e._id)}
                href={`/entry/${e._id}`}
                className="group flex items-start gap-4 rounded-xl border border-border bg-bg-surface px-4 py-3 hover:border-border-strong transition-colors"
              >
                <div className="text-xs text-text-muted font-mono w-24 shrink-0 mt-0.5">
                  {formatShortDate(e.date)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-secondary group-hover:text-text-primary transition-colors line-clamp-2">
                    {preview}
                    {typeof preview === "string" && preview.length === 140 && "…"}
                  </div>
                  {e.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5">
                      {e.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-text-muted font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-text-muted font-mono shrink-0 mt-0.5">
                  {e.wordCount}w
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm">
          {pageNum > 1 ? (
            <Link
              href={`/history?${new URLSearchParams({
                ...(tag ? { tag } : {}),
                page: String(pageNum - 1),
              }).toString()}`}
              className="text-accent hover:text-accent-hover"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-text-muted font-mono">
            Page {pageNum} of {Math.ceil(total / limit)}
          </span>
          {pageNum * limit < total ? (
            <Link
              href={`/history?${new URLSearchParams({
                ...(tag ? { tag } : {}),
                page: String(pageNum + 1),
              }).toString()}`}
              className="text-accent hover:text-accent-hover"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
