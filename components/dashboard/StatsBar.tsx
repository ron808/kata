"use client";

import { AnimatedNumber } from "@/components/shared/AnimatedNumber";

interface Stat {
  label: string;
  value: number;
  unit?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

export function StatsBar({
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
  const stats: Stat[] = [
    {
      label: "Current streak",
      value: streak,
      unit: "days",
      highlight: true,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M13.5 0.67s.74 7.65 6.36 11.05c-.91-2.74-3.36-4.74-3.36-4.74S20 9.61 20 14.27c0 4.7-3.81 8.51-8.51 8.51S3 18.97 3 14.27c0-2.83 2.16-5.39 4.32-7.32C9.49 5.04 11.13 3 11.13 3s-.16 1.16-.16 2.06c0 1.43.42 2.6 2.4 2.81C13.55 5.5 13.5 0.67 13.5 0.67z" />
        </svg>
      ),
    },
    { label: "Longest streak", value: longestStreak, unit: "days" },
    { label: "Total entries", value: totalEntries },
    { label: "Total words", value: totalWords },
    { label: "Avg words / entry", value: averageWords },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl border p-4 ${
            s.highlight
              ? "border-accent/30 bg-accent/5"
              : "border-border bg-bg-surface"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-text-secondary uppercase tracking-wide font-mono">
            {s.icon && (
              <span
                className={s.highlight ? "text-accent" : "text-text-muted"}
              >
                {s.icon}
              </span>
            )}
            {s.label}
          </div>
          <div
            className={`mt-1 flex items-baseline gap-1.5 text-2xl font-semibold ${
              s.highlight ? "text-accent" : "text-text-primary"
            }`}
          >
            <AnimatedNumber value={s.value} />
            {s.unit && (
              <span className="text-xs font-normal text-text-muted">
                {s.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
