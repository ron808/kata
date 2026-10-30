import Link from "next/link";
import { Icon } from "@/components/shared/Icon";
import { EnergyBars, MoodDots, energyLabel, moodLabel } from "@/components/entry/fields/meters";
import { hueForTag } from "@/components/entry/hue";
import { firstLines } from "@/lib/utils/excerpt";
import { isoDay, todayUtcMidnight } from "@/lib/utils/dates";
import type { Entry } from "@/lib/types";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

/** The page's own mood answer, if its template asks for one, else the day's check-in with Kata. */
function moodOf(e: Entry, moods?: Record<string, number | null>): number | null {
  const own = e.fields.find((f) => f.type === "mood_slider" && typeof f.value === "number");
  if (own) return own.value as number;
  return moods?.[e.date.slice(0, 10)] ?? null;
}

function energyOf(e: Entry): number | null {
  const own = e.fields.find((f) => f.type === "energy" && typeof f.value === "number");
  return own ? (own.value as number) : null;
}

/**
 * Pages as rows of dated slips: a date sticker, the first written line, and the words, tags and
 * mood at a glance. Rows only; frame them with a card (`card overflow-hidden`).
 */
export function PageList({
  entries,
  showMonth = true,
  moods,
  tagHues,
}: {
  entries: Entry[];
  showMonth?: boolean;
  /** Mood from Kata's daily check-in, by yyyy-mm-dd, for templates without a mood field. */
  moods?: Record<string, number | null>;
  /** Hues of tags that belong to a thread, so a tag keeps its thread's colour. */
  tagHues?: Record<string, number>;
}) {
  const today = isoDay(todayUtcMidnight());
  return (
    <ul className="divide-y-2 divide-ink/[0.14]">
      {entries.map((e) => {
        const iso = e.date.slice(0, 10);
        const isToday = iso === today;
        const mood = moodOf(e, moods);
        const label = moodLabel(mood);
        const energy = energyOf(e);
        const energyWord = energyLabel(energy);
        const line = firstLines(e, 180);
        const words = e.wordCount ?? 0;
        const tags = e.tags.slice(0, 3);
        const meta = (
          <>
            <span className="tabular-nums">
              {words.toLocaleString("en-US")} {words === 1 ? "word" : "words"}
            </span>
            {label && mood ? (
              <span className="inline-flex items-center gap-1.5">
                <MoodDots value={mood} className="text-ink" />
                {label}
                <span className="sr-only"> mood</span>
              </span>
            ) : null}
            {energyWord && energy ? (
              <span className="inline-flex items-center gap-1.5">
                <EnergyBars value={energy} className="text-ink" />
                {energyWord}
                <span className="sr-only"> energy</span>
              </span>
            ) : null}
          </>
        );
        return (
          <li key={e._id ?? e.date}>
            <Link
              href={e._id ? `/entry/${e._id}` : "/entry/new"}
              className="group grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-x-4 px-4 py-4 transition-colors duration-300 hover:bg-ink/[0.035] focus-visible:-outline-offset-4 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:gap-x-6 sm:px-6"
            >
              <span
                className={`grid min-h-[3.75rem] content-center justify-items-center rounded-md border-2 border-edge px-1 py-1.5 text-center sm:min-h-[4.25rem] ${
                  isToday ? "bg-sun text-on-sun" : "bg-surface"
                }`}
              >
                {showMonth ? (
                  <span className="text-[0.8125rem] font-semibold leading-none">{fmt(e.date, { month: "short" })}</span>
                ) : null}
                <span className="font-display text-[1.75rem] leading-[0.95] tabular-nums sm:text-[2rem]">
                  {fmt(e.date, { day: "numeric" })}
                </span>
                <span className={`text-[0.8125rem] font-medium leading-none ${isToday ? "" : "text-ink/70"}`}>
                  {isToday ? "Today" : fmt(e.date, { weekday: "short" })}
                </span>
              </span>
              <span className="min-w-0">
                <span className={`line-clamp-2 text-[1rem] leading-snug ${line ? "text-ink" : "text-ink/65"}`}>
                  {line || "No writing on this page."}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] font-medium text-ink/70">
                  {tags.map((t) => (
                    <span key={t} data-hue={hueForTag(t, tagHues)} className="tag max-w-full">
                      <span className="truncate">#{t}</span>
                    </span>
                  ))}
                  <span className="contents sm:hidden">{meta}</span>
                </span>
              </span>
              <span className="flex items-center gap-5 text-[0.875rem] font-medium text-ink/70 max-sm:hidden">
                <span className="flex flex-col items-end gap-1">{meta}</span>
                <Icon
                  name="arrow"
                  className="h-5 w-5 text-ink/50 transition-transform duration-500 ease-out group-hover:translate-x-1 group-hover:text-ink"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
