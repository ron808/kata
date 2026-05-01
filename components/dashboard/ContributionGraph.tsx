"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { buildContributionGrid } from "@/lib/utils/dates";
import { formatShortDate } from "@/lib/utils/dates";

const LEVEL_COLORS = [
  "#1e293b",
  "#312e81",
  "#4338ca",
  "#6366f1",
  "#a5b4fc",
];

export function ContributionGraph({
  data,
}: {
  data: { date: string; wordCount: number }[];
}) {
  const cells = useMemo(() => buildContributionGrid(data), [data]);
  const columns: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    date: string;
    wordCount: number;
  } | null>(null);

  return (
    <div className="relative">
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell, ri) => (
              <motion.div
                key={cell.date}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: ci * 0.005 + ri * 0.001,
                  duration: 0.18,
                }}
                onMouseEnter={(e) => {
                  const r = (e.target as HTMLElement).getBoundingClientRect();
                  setHover({
                    x: r.left + r.width / 2,
                    y: r.top,
                    date: cell.date,
                    wordCount: cell.wordCount,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                className="w-[12px] h-[12px] rounded-[3px] cursor-pointer transition-transform hover:scale-110"
                style={{ background: LEVEL_COLORS[cell.level] }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-text-muted font-mono">
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => (
          <span
            key={i}
            className="w-3 h-3 rounded-[3px]"
            style={{ background: c }}
          />
        ))}
        <span>More</span>
      </div>

      {hover && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mt-[-8px] rounded-md bg-bg-elevated border border-border-strong px-3 py-2 text-xs shadow-2xl"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="font-mono text-text-secondary">
            {formatShortDate(hover.date)}
          </div>
          <div className="text-text-primary mt-0.5">
            {hover.wordCount > 0
              ? `${hover.wordCount.toLocaleString()} words`
              : "No entry"}
          </div>
        </div>
      )}
    </div>
  );
}
