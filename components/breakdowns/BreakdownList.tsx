import Link from "next/link";
import { periodTitle, rangeText } from "@/lib/breakdowns/period";
import { summaryLine } from "@/lib/breakdowns/summary";
import type { BreakdownT } from "@/lib/types";

/** Breakdowns, the newest first, each with its score. */
export function BreakdownList({ items, today, current = null }: { items: BreakdownT[]; today: string; current?: string | null }) {
  return (
    <nav aria-label="Breakdowns" className="card p-2 sm:p-3">
      <ul>
        {items.map((b) => {
          const here = b._id === current;
          return (
            <li key={b._id} className="rule border-t-2 first:border-t-0">
              <Link
                href={`/breakdowns/${b._id}`}
                aria-current={here ? "page" : undefined}
                className={`flex min-h-16 items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${here ? "bg-sun text-on-sun" : "hover:bg-ink/[0.04]"}`}
              >
                <span
                  aria-hidden
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-edge font-display text-[1.375rem] tabular-nums ${
                    here ? "bg-surface text-ink" : b.score === null ? "bg-raised" : "bg-sun text-on-sun"
                  }`}
                >
                  {b.score ?? "–"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {periodTitle(b, b.upTo, today)}
                    <span className="sr-only">, {b.score === null ? "no score" : `${b.score} out of 10`}</span>
                  </span>
                  <span className={`block truncate text-[0.8125rem] ${here ? "opacity-85" : "text-ink/65"}`}>
                    {b.kind === "weekly" ? "Weekly" : "Asked"} · {rangeText(b.counted, b.upTo, today)} · {summaryLine(b.stats, b.parts)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
