/** The habit in numbers, set as type rather than tiles. The streak leads. */
export function StatsRow({
  streak,
  longestStreak,
  totalEntries,
  totalWords,
  averageWords,
}: {
  streak: number;
  longestStreak: number;
  totalEntries: number;
  totalWords: number;
  averageWords: number;
}) {
  const rest = [
    { label: "Longest streak", value: longestStreak, unit: longestStreak === 1 ? "day" : "days" },
    { label: "Pages written", value: totalEntries },
    { label: "Words", value: totalWords },
    { label: "Words per page", value: averageWords },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] lg:items-end">
      <div className="col-span-2 sm:col-span-4 lg:col-span-1">
        <dt className="text-[0.9375rem] text-ink/65">Current streak</dt>
        <dd className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-[clamp(4rem,3rem+4vw,6.5rem)] leading-[0.85] tabular-nums">{streak}</span>
          <span className="font-display text-2xl text-ink/70">{streak === 1 ? "day" : "days"}</span>
        </dd>
      </div>
      {rest.map((s) => (
        <div key={s.label} className="rule border-t-2 pt-3 lg:border-t-0 lg:border-l-2 lg:pl-5 lg:pt-0">
          <dt className="text-[0.9375rem] text-ink/65">{s.label}</dt>
          <dd className="mt-1 font-display text-[clamp(1.9rem,1.5rem+1vw,2.5rem)] leading-none tabular-nums">
            {s.value.toLocaleString()}
            {s.unit ? <span className="ml-1.5 text-lg text-ink/65">{s.unit}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
