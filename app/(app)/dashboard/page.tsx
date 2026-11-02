import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Digest } from "@/lib/db/models/Digest";
import { Entry } from "@/lib/db/models/Entry";
import { User } from "@/lib/db/models/User";
import { isGroqConfigured } from "@/lib/ai/groq";
import { loadCompanion, type CompanionState } from "@/lib/companion/load";
import { namesFor } from "@/lib/companion/naming";
import { dayToDate, localDay, validTimeZone } from "@/lib/companion/time";
import { loadFeed, loadPeople } from "@/lib/social/load";
import { workingOn, type WorkingOnT } from "@/lib/social/working";
import { buildAlmanac } from "@/lib/utils/almanac";
import { streakFromDates } from "@/lib/utils/streaks";
import { SetupCard } from "@/components/home/SetupCard";
import { formatDate, hourIn, isoDay } from "@/lib/utils/dates";
import { AppPage } from "@/components/shared/AppPage";
import { AlmanacLegend, YearAlmanac } from "@/components/shared/YearAlmanac";
import { LetterCard } from "@/components/dashboard/LetterCard";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { HomeBoard } from "@/components/home/HomeBoard";
import { PeopleRow } from "@/components/home/PeopleRow";
import { PeopleProvider } from "@/components/people/viewer";
import { TodayQuestions } from "@/components/home/TodayQuestions";
import { WorkingOn } from "@/components/home/WorkingOn";
import type { DigestSummary, MomentT, PersonT } from "@/lib/types";

const CHECK_IN_LINE = {
  morning: "Checks in every morning",
  evening: "Checks in every evening",
  both: "Checks in morning and evening",
} as const;

interface HomeData {
  companion: CompanionState;
  tz: string;
  today: string;
  checkIn: keyof typeof CHECK_IN_LINE;
  handle: string | null;
  needsSetup: boolean;
  todayEntryId: string | null;
  letter: DigestSummary | null;
  moments: MomentT[];
  suggested: PersonT[];
  working: WorkingOnT[];
  words: Map<string, number>;
  stats: { streak: number; longestStreak: number; totalEntries: number; totalWords: number; averageWords: number };
}

async function loadHome(userId: string): Promise<HomeData | null> {
  try {
    await connectDB();
    const user = await User.findById(userId).select("name handle timezone checkIn activeTemplateId onboardedAt streak longestStreak totalEntries totalWords").lean();
    if (!user) return null;
    const tz = validTimeZone(user.timezone);
    const [companion, entries, letter, feed, people, working] = await Promise.all([
      loadCompanion(userId),
      Entry.find({ userId }).select("date wordCount").sort({ date: -1 }).limit(366).lean(),
      Digest.findOne({ userId, isRead: false }).sort({ createdAt: -1 }).lean(),
      loadFeed(userId, { scope: "following" }),
      loadPeople(userId, {}),
      workingOn(userId),
    ]);
    const today = localDay(tz);
    const todayEntry = entries.find((e) => isoDay(e.date) === today);
    const totalEntries = user.totalEntries ?? entries.length;
    const totalWords = user.totalWords ?? 0;
    return {
      companion,
      tz,
      today,
      checkIn: user.checkIn ?? "morning",
      handle: user.handle ?? null,
      // Accounts from before the companion have a page but have never met Kata.
      needsSetup: !user.activeTemplateId || !user.onboardedAt,
      todayEntryId: todayEntry ? String(todayEntry._id) : null,
      letter: letter
        ? {
            _id: String(letter._id),
            type: letter.type,
            periodStart: letter.periodStart.toISOString(),
            periodEnd: letter.periodEnd.toISOString(),
            content: letter.content,
            entryCount: letter.entryCount,
            wordCount: letter.wordCount,
            isRead: letter.isRead,
            createdAt: letter.createdAt.toISOString(),
          }
        : null,
      moments: feed.moments.filter((m) => !m.isMine).slice(0, 3),
      suggested: people.suggested.slice(0, 4),
      working,
      words: new Map(entries.map((e) => [isoDay(e.date), e.wordCount ?? 0])),
      stats: {
        streak: streakFromDates(entries.map((e) => e.date), dayToDate(today)),
        longestStreak: user.longestStreak ?? 0,
        totalEntries,
        totalWords,
        averageWords: totalEntries ? Math.round(totalWords / totalEntries) : 0,
      },
    };
  } catch (err) {
    console.error("home:load", err);
    return null;
  }
}

function greeting(hour: number) {
  if (hour < 4) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const session = await auth();
  // The greeting uses what they asked to be called.
  const [data, { name, nickname: first }] = await Promise.all([loadHome(session!.user.id), namesFor(session!.user.id)]);
  const tz = data?.tz ?? "UTC";
  const now = new Date();

  return (
    <AppPage>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium text-ink/70">{data ? formatDate(dayToDate(data.today), "long", "UTC") : formatDate(now, "long", tz)}</p>
          <h1 className="mt-2 font-display text-display-m">
            {greeting(hourIn(tz, now))}
            {first ? (
              <>
                , <span className="mark">{first}</span>
              </>
            ) : null}
            .
          </h1>
        </div>
        {data && data.stats.streak > 1 ? (
          <p
            className="grid h-24 w-24 shrink-0 rotate-6 place-items-center content-center rounded-full border-2 border-edge bg-sun text-center text-on-sun shadow-sticker-sm max-sm:hidden"
            aria-label={`${data.stats.streak}-day streak`}
          >
            <span className="font-display text-[2.1rem] leading-none tabular-nums">{data.stats.streak}</span>
            <span className="text-[0.75rem] font-semibold leading-tight">day streak</span>
          </p>
        ) : null}
      </header>

      {!data ? (
        <p role="alert" data-hue="0" className="mt-8 rounded-md border-2 border-edge bg-tint px-4 py-3 text-[0.9375rem] font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      ) : (
        <>
          {data.needsSetup ? <SetupCard name={name} /> : null}

          <div className="mt-8">
            <HomeBoard
              messages={data.companion.messages}
              threads={data.companion.threads}
              today={data.today}
              tz={tz}
              checkInLine={CHECK_IN_LINE[data.checkIn]}
              moodWeek={data.companion.mood.week}
              ai={isGroqConfigured()}
              questions={
                <>
                  <TodayQuestions
                    questions={data.companion.questions}
                    threads={data.companion.threads}
                    todayEntryId={data.todayEntryId}
                    past={data.companion.pageDay !== data.today}
                    companionName={name}
                  />
                  <LetterCard digest={data.letter} companionName={name} />
                </>
              }
              aside={<WorkingOn items={data.working} today={data.today} tz={tz} />}
            />
          </div>

          <div className="mt-6">
            {/* Reacting or replying here asks for a handle first if there isn't one. */}
            <PeopleProvider handle={data.handle}>
              <PeopleRow moments={data.moments} suggested={data.suggested} />
            </PeopleProvider>
          </div>

          <YearCard words={data.words} stats={data.stats} today={data.today} />
        </>
      )}
    </AppPage>
  );
}

function YearCard({ words, stats, today }: { words: Map<string, number>; stats: HomeData["stats"]; today: string }) {
  const months = buildAlmanac(words, dayToDate(today));
  const written = [...words.keys()].filter((d) => d >= months[0].days[0].date).length;
  return (
    <section aria-labelledby="year-heading" className="card mt-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="year-heading" className="font-display text-display-s">
          Your year
        </h2>
        <Link href="/history" className="link inline-flex min-h-11 items-center text-[0.875rem] font-semibold">
          All pages
        </Link>
      </div>
      <div className="mt-6">
        <StatsRow {...stats} />
      </div>
      <YearAlmanac className="mt-8" months={months} label={`${written} pages written in the last twelve months.`} />
      <div className="rule mt-6 flex flex-wrap items-center justify-between gap-4 border-t-2 pt-4">
        <p className="text-[0.8125rem] text-ink/65">
          {written} {written === 1 ? "page" : "pages"} in twelve months
        </p>
        <AlmanacLegend />
      </div>
    </section>
  );
}
