import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Entry } from "@/lib/db/models/Entry";
import { Digest } from "@/lib/db/models/Digest";
import { User } from "@/lib/db/models/User";
import { todayUtcMidnight, isoDay } from "@/lib/utils/dates";
import { streakFromDates } from "@/lib/utils/streaks";
import { ContributionGraph } from "@/components/dashboard/ContributionGraph";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { DigestCard } from "@/components/dashboard/DigestCard";
import { QuickEntry } from "@/components/dashboard/QuickEntry";
import { RecentEntries } from "@/components/dashboard/RecentEntries";
import type { Entry as EntryT } from "@/lib/types";

interface LoadedData {
  contributions: { date: string; wordCount: number }[];
  todayEntry: EntryT | null;
  recent: EntryT[];
  pinnedDigest: {
    _id: string;
    type: "weekly" | "monthly";
    periodStart: string;
    periodEnd: string;
    content: string;
    entryCount: number;
    wordCount: number;
    isRead: boolean;
    createdAt: string;
  } | null;
  stats: {
    streak: number;
    longestStreak: number;
    totalEntries: number;
    totalWords: number;
    averageWords: number;
  };
  hasDb: boolean;
}

async function loadData(userId: string): Promise<LoadedData> {
  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    const entries = await Entry.find({ userId })
      .sort({ date: -1 })
      .limit(366)
      .lean();
    const today = todayUtcMidnight();
    const todayEntry =
      entries.find((e) => isoDay(e.date) === isoDay(today)) ?? null;
    const recent = entries.slice(0, 5);
    const pinned = await Digest.findOne({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .lean();
    const totalEntries = user?.totalEntries ?? entries.length;
    const totalWords =
      user?.totalWords ??
      entries.reduce((acc, e) => acc + (e.wordCount ?? 0), 0);
    const averageWords =
      totalEntries === 0 ? 0 : Math.round(totalWords / totalEntries);
    const streak =
      user?.streak ??
      streakFromDates(entries.map((e) => new Date(e.date)));
    return {
      contributions: entries.map((e) => ({
        date: isoDay(e.date),
        wordCount: e.wordCount ?? 0,
      })),
      todayEntry: todayEntry
        ? {
            _id: String(todayEntry._id),
            date: isoDay(todayEntry.date),
            wordCount: todayEntry.wordCount ?? 0,
            tags: todayEntry.tags ?? [],
            fields: (todayEntry.fields ?? []).map((f) => ({
              fieldId: f.fieldId,
              type: f.type as EntryT["fields"][number]["type"],
              label: f.label,
              value: f.value as EntryT["fields"][number]["value"],
            })),
          }
        : null,
      recent: recent.map((e) => ({
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
      })),
      pinnedDigest: pinned
        ? {
            _id: String(pinned._id),
            type: pinned.type,
            periodStart: pinned.periodStart.toISOString(),
            periodEnd: pinned.periodEnd.toISOString(),
            content: pinned.content,
            entryCount: pinned.entryCount,
            wordCount: pinned.wordCount,
            isRead: pinned.isRead,
            createdAt: pinned.createdAt.toISOString(),
          }
        : null,
      stats: {
        streak,
        longestStreak: user?.longestStreak ?? streak,
        totalEntries,
        totalWords,
        averageWords,
      },
      hasDb: true,
    };
  } catch {
    return {
      contributions: [],
      todayEntry: null,
      recent: [],
      pinnedDigest: null,
      stats: {
        streak: 0,
        longestStreak: 0,
        totalEntries: 0,
        totalWords: 0,
        averageWords: 0,
      },
      hasDb: false,
    };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await loadData(session!.user.id);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
      <header>
        <div className="text-xs uppercase tracking-widest text-text-muted font-mono">
          Hey {session?.user?.name?.split(" ")[0] ?? "there"}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          Your Kata
        </h1>
      </header>

      {!data.hasDb && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
          Database not configured. Add{" "}
          <code className="font-mono text-xs">MONGODB_URI</code> to your{" "}
          <code className="font-mono text-xs">.env.local</code> to start saving
          entries.
        </div>
      )}

      {data.pinnedDigest && (
        <DigestCard
          digest={{
            ...data.pinnedDigest,
          }}
        />
      )}

      <QuickEntry todayEntry={data.todayEntry} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-widest text-text-muted font-mono">
            One year of writing
          </h2>
          <Link
            href="/history"
            className="text-sm text-accent hover:text-accent-hover"
          >
            View history →
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-bg-surface p-5 overflow-x-auto">
          <ContributionGraph data={data.contributions} />
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-text-muted font-mono mb-4">
          Stats
        </h2>
        <StatsBar {...data.stats} />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-text-muted font-mono mb-4">
          Recent entries
        </h2>
        <RecentEntries entries={data.recent} />
      </section>
    </div>
  );
}
