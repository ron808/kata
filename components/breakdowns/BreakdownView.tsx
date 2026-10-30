import Link from "next/link";
import { Icon } from "@/components/shared/Icon";
import { KIND_LABEL } from "@/components/shared/Status";
import { periodTitle, rangeText } from "@/lib/breakdowns/period";
import { percent, plural, verdictOf } from "@/lib/breakdowns/summary";
import { dayDiff } from "@/lib/companion/time";
import type { BreakdownT, BreakdownThread } from "@/lib/types";
import { BreakdownActions } from "./BreakdownActions";
import { DRAWN_DAYS, DayBars, DayStrip, Meter } from "./Charts";
import { Take } from "./Take";

const MOODS = ["foggy", "low", "okay", "good", "bright"];
const BEFORE: Record<BreakdownT["unit"], string> = { day: "the day before", week: "the week before", month: "the month before", year: "the year before", days: "" };

const number = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

/** "Up from 6 the week before", "Down from 8 at this point the month before". */
function comparison(b: BreakdownT): string | null {
  const prev = b.previous?.score;
  if (!prev || b.score === null) return null;
  const before = BEFORE[b.unit] || `the ${dayDiff(b.to, b.from) + 1} days before`;
  const when = b.upTo < b.to ? `at this point ${before}` : before;
  return b.score === prev ? `The same as ${when}` : `${b.score > prev ? "Up" : "Down"} from ${prev} ${when}`;
}

function Score({ score }: { score: number | null }) {
  return (
    <div
      role="img"
      aria-label={score === null ? "No score yet" : `${score} out of 10`}
      className={`grid h-32 w-32 shrink-0 -rotate-3 place-items-center rounded-full border-2 border-edge shadow-sticker sm:h-36 sm:w-36 ${score === null ? "bg-raised" : "bg-sun text-on-sun"}`}
    >
      <span className="flex items-baseline font-display leading-none">
        <span className="text-[4.25rem] tabular-nums sm:text-[5rem]">{score ?? "–"}</span>
        {score !== null ? <span className="text-[1.375rem]">/10</span> : null}
      </span>
    </div>
  );
}

function Part({ label, value, note, meter }: { label: string; value: string; note: string; meter: number | null }) {
  return (
    <div className="well p-4">
      <dt className="text-[0.875rem] font-semibold text-ink/70">{label}</dt>
      <dd className="mt-1">
        <span className="block font-display text-display-s tabular-nums">{value}</span>
        <span className="mt-0.5 block text-[0.875rem] text-ink/70">{note}</span>
        <Meter value={meter} />
      </dd>
    </div>
  );
}

function ThreadRow({ t, note }: { t: BreakdownThread; note?: string }) {
  return (
    <li className="rule border-t-2 first:border-t-0">
      <Link href={`/threads?t=${t.id}`} className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-ink/[0.04]">
        <span data-hue={t.hue} className="h-8 w-8 shrink-0 rounded-full border-2 border-edge bg-hue" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{t.title}</span>
          <span className="block truncate text-[0.8125rem] text-ink/65">
            {KIND_LABEL[t.kind]}
            {note ? ` · ${note}` : ""}
          </span>
        </span>
        <Icon name="arrow" className="h-4 w-4 shrink-0 text-ink/55" />
      </Link>
    </li>
  );
}

/** A breakdown in full: the score and what it's made of, Maru's take, then what happened. */
export function BreakdownView({ b, today, tz, name, heading: Heading = "h2" }: { b: BreakdownT; today: string; tz: string; name: string; heading?: "h1" | "h2" }) {
  const s = b.stats;
  const id = `breakdown-${b._id}`;
  const versus = comparison(b);
  const long = dayDiff(b.upTo, b.counted) + 1 > DRAWN_DAYS;
  const groups: { title: string; items: BreakdownThread[]; note?: (t: BreakdownThread) => string }[] = [
    { title: "Done", items: s.done },
    { title: "Moving", items: s.moved, note: (t) => plural((t as BreakdownThread & { updates: number }).updates, "update") },
    { title: "Stuck", items: s.stuck },
  ];
  const anyThreads = groups.some((g) => g.items.length) || s.started.length > 0;
  const moodAverage = s.moods.length ? s.moods.reduce((n, m) => n + m.mood, 0) / s.moods.length : null;

  return (
    <article aria-labelledby={id} className="grid grid-cols-1 gap-6">
      <section className="card p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Score score={b.score} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-medium text-ink/70">{b.kind === "weekly" ? "Your weekly breakdown" : "A breakdown you asked for"}</p>
            <Heading id={id} className="mt-1 font-display text-display-l leading-[0.95] [overflow-wrap:anywhere]">
              {periodTitle(b, b.upTo, today)}
            </Heading>
            <p className="mt-3 text-lede">
              {verdictOf(b.score)}
              {versus ? <span className="text-ink/70"> · {versus}</span> : null}
            </p>
            <p className="mt-1 text-[0.9375rem] text-ink/70">
              {rangeText(b.counted, b.upTo, today)}
              {b.counted > b.from ? " · counted from the day you joined" : ""}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Part label="Showed up" value={s.days ? `${s.active.length} of ${s.days}` : "–"} note={s.days ? "days with something logged" : "No days counted yet"} meter={b.parts.showingUp} />
          <Part
            label="Threads moved"
            value={b.parts.progress === null ? "–" : `${s.done.length + s.moved.length} of ${s.open}`}
            note={b.parts.progress === null ? "No open threads in this stretch" : `${s.done.length} done, ${s.moved.length} moving`}
            meter={b.parts.progress}
          />
          <Part
            label="Habits kept"
            value={b.parts.habits === null ? "–" : percent(b.parts.habits)}
            note={b.parts.habits === null ? "No habits in this stretch" : `of their days, across ${plural(s.habits.length, "habit")}`}
            meter={b.parts.habits}
          />
        </dl>

        {b.kind === "asked" ? (
          <div className="rule mt-6 border-t-2 pt-5">
            <BreakdownActions id={b._id} expiresAt={b.expiresAt} tz={tz} />
          </div>
        ) : null}
      </section>

      {b.score !== null ? <Take id={b._id} initial={b.take} name={name} /> : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {anyThreads ? (
          <section aria-labelledby={`${id}-threads`} className="card p-2 sm:p-3">
            <h2 id={`${id}-threads`} className="px-3 pb-1 pt-3 font-display text-display-s">
              Threads
            </h2>
            {groups.map((g) =>
              g.items.length ? (
                <div key={g.title} className="px-1 pb-1">
                  <h3 className="px-2 pt-3 text-[0.9375rem] font-semibold">
                    {g.title} <span className="tabular-nums text-ink/60">{g.items.length}</span>
                  </h3>
                  <ul className="mt-1">
                    {g.items.map((t) => (
                      <ThreadRow key={t.id} t={t} note={g.note?.(t)} />
                    ))}
                  </ul>
                </div>
              ) : null
            )}
            {s.started.length ? (
              <div className="px-3 pb-3 pt-3">
                <h3 className="text-[0.9375rem] font-semibold">
                  Started <span className="tabular-nums text-ink/60">{s.started.length}</span>
                </h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {s.started.map((t) => (
                    <li key={t.id} className="max-w-full">
                      <span data-hue={t.hue} className="tag max-w-full">
                        <span className="truncate">{t.title}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby={`${id}-days`} className="card p-5 sm:p-6">
          <h2 id={`${id}-days`} className="font-display text-display-s">
            Your days
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6">
            <div>
              <p className="font-semibold">{s.days ? `Something logged on ${s.active.length} of ${plural(s.days, "day")}` : "Nothing counted yet"}</p>
              <div className="mt-2.5">
                <DayStrip from={b.counted} upTo={b.upTo} on={s.active} label={`Something logged on ${s.active.length} of ${s.days} days`} />
              </div>
            </div>
            <div>
              <p className="font-semibold">{s.pages.days.length ? `Wrote on ${plural(s.pages.days.length, "day")}` : "No pages written"}</p>
              {s.pages.days.length ? <p className="text-[0.875rem] text-ink/70">{plural(s.pages.words, "word")} in all</p> : null}
              {s.pages.days.length ? (
                <div className="mt-2.5">
                  <DayStrip from={b.counted} upTo={b.upTo} on={s.pages.days} label={`Pages written on ${s.pages.days.length} days`} />
                </div>
              ) : null}
            </div>
            {moodAverage !== null ? (
              <div>
                <p className="font-semibold">Mood: mostly {MOODS[Math.round(moodAverage) - 1] ?? "okay"}</p>
                <p className="text-[0.875rem] text-ink/70">{plural(s.moods.length, "check-in")} · the taller, the brighter</p>
                <div className="mt-2.5 max-w-[24rem]">
                  <DayBars
                    from={b.counted}
                    upTo={b.upTo}
                    values={s.moods.map((m) => ({ day: m.day, value: m.mood }))}
                    max={5}
                    label={`Moods: ${s.moods.map((m) => MOODS[m.mood - 1]).join(", ")}`}
                  />
                </div>
              </div>
            ) : null}
            {s.people.moments || s.people.replies ? (
              <p className="font-semibold">
                Shared {plural(s.people.moments, "moment")}, wrote {plural(s.people.replies, "reply", "replies")}
              </p>
            ) : null}
          </div>
        </section>

        {s.habits.length ? (
          <section aria-labelledby={`${id}-habits`} className="card p-5 sm:p-6">
            <h2 id={`${id}-habits`} className="font-display text-display-s">
              Habits
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-5">
              {s.habits.map((h) => (
                <li key={h.id} data-hue={h.hue}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/threads?t=${h.id}`} className="flex min-w-0 items-center gap-2 font-semibold hover:underline">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-edge bg-hue" aria-hidden />
                      <span className="truncate">{h.title}</span>
                    </Link>
                    <span className="shrink-0 text-[0.875rem] tabular-nums text-ink/70">
                      {h.days.length} of {plural(h.of, "day")}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    {long ? (
                      <Meter value={h.of ? h.days.length / h.of : null} />
                    ) : (
                      <DayStrip from={h.since ?? b.counted} upTo={b.upTo} on={h.days} hue={h.hue} label={`${h.title}: done on ${h.days.length} of ${h.of} days`} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {s.numbers.length ? (
          <section aria-labelledby={`${id}-numbers`} className="card p-5 sm:p-6">
            <h2 id={`${id}-numbers`} className="font-display text-display-s">
              Numbers
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-5">
              {s.numbers.map((n) => {
                const unit = n.unit ? ` ${n.unit}` : "";
                return (
                  <li key={`${n.thread.id}-${n.label}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-semibold">
                        {n.thread.title} <span className="font-normal text-ink/65">· {n.label}</span>
                      </span>
                      <span className="shrink-0 font-display text-[1.375rem] tabular-nums">
                        {number(n.total)}
                        {unit}
                      </span>
                    </div>
                    <p className="text-[0.875rem] text-ink/70">
                      {plural(n.days, "day")} logged{n.goal ? ` · reached ${number(n.goal)}${unit} on ${plural(n.hit, "day")}` : ""}
                    </p>
                    <div className="mt-2 max-w-[24rem]">
                      <DayBars
                        from={b.counted}
                        upTo={b.upTo}
                        values={n.values}
                        max={Math.max(...n.values.map((v) => v.value))}
                        goal={n.goal}
                        hue={n.thread.hue}
                        label={`${n.label}: ${n.values.map((v) => `${number(v.value)}${unit}`).join(", ")}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <p className="max-w-[62ch] text-[0.875rem] text-ink/70">
        Worked out from what you logged in Kata, not judged by {name}: the days you showed up, the open threads you finished or moved, and the days you kept your habits. A part with nothing to go on is left out of the score.
      </p>
    </article>
  );
}
