import type { AlmanacMonth, Level } from "@/lib/utils/almanac";

// Stamp depth per level: each written day is a vermilion stamp, deeper for longer pages.
const FILL: Record<Level, number> = { 0: 0, 1: 0.35, 2: 0.55, 3: 0.78, 4: 1 };

/**
 * The year as twelve small calendars, Monday first. Each written day is stamped in
 * Kata's vermilion; today is outlined in ink.
 */
export function YearAlmanac({
  months,
  label,
  className = "",
}: {
  months: AlmanacMonth[];
  label: string;
  className?: string;
}) {
  return (
    <div role="img" aria-label={label} className={className}>
      <div aria-hidden className="grid grid-cols-3 gap-x-[clamp(0.9rem,2.4vw,1.75rem)] gap-y-7 sm:grid-cols-4 lg:grid-cols-6">
        {months.map((m) => (
          <div key={m.key}>
            <p className="mb-2.5 text-[0.8125rem] font-semibold text-ink/70">{m.label}</p>
            <div className="grid grid-cols-7 gap-[clamp(2px,0.3vw,3px)]">
              {Array.from({ length: m.lead }, (_, i) => (
                <span key={`lead-${i}`} />
              ))}
              {m.days.map((d) => (
                <span
                  key={d.date}
                  title={d.future ? undefined : `${d.date} · ${d.words ? `${d.words.toLocaleString()} words` : "no page"}`}
                  className={`relative aspect-square rounded-[3px] ${
                    d.future ? "bg-ink/[0.03]" : "bg-ink/[0.08]"
                  } ${d.today ? "outline-2 outline-offset-1 outline-edge outline" : ""}`}
                >
                  {d.level > 0 ? (
                    <span
                      data-fill
                      className="absolute inset-0 rounded-[inherit] bg-accent"
                      style={{ opacity: FILL[d.level] }}
                    />
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlmanacLegend({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-2 text-[0.8125rem] text-ink/65 ${className}`}>
      <span>No page</span>
      {([0, 1, 2, 3, 4] as Level[]).map((l) => (
        <span key={l} className="relative h-3 w-3 rounded-[3px] bg-ink/[0.08]">
          {l > 0 ? <span className="absolute inset-0 rounded-[inherit] bg-accent" style={{ opacity: FILL[l] }} /> : null}
        </span>
      ))}
      <span>Long page</span>
    </div>
  );
}
