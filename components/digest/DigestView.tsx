"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatShortDate } from "@/lib/utils/dates";
import type { DigestSummary } from "@/lib/types";

export function DigestView({
  type,
  digests,
}: {
  type: "weekly" | "monthly";
  digests: DigestSummary[];
}) {
  const [activeId, setActiveId] = useState(digests[0]?._id ?? null);
  const active = digests.find((d) => d._id === activeId) ?? digests[0];
  const otherType = type === "weekly" ? "monthly" : "weekly";

  useEffect(() => {
    if (active && !active.isRead) {
      void fetch(`/api/digests/${active._id}/read`, { method: "PATCH" });
    }
  }, [active]);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-text-muted font-mono">
            Digests
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1 capitalize">
            {type === "weekly" ? "Weekly digests" : "Monthly letters"}
          </h1>
        </div>
        <Link
          href={`/digest/${otherType}`}
          className="text-sm text-accent hover:text-accent-hover"
        >
          View {otherType} →
        </Link>
      </header>

      {digests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-surface/50 p-12 text-center">
          <div className="text-2xl font-mono text-text-muted">…</div>
          <p className="text-text-secondary mt-3">
            No {type} digests yet.
          </p>
          <p className="text-text-muted text-sm mt-1">
            {type === "weekly"
              ? "Your first one arrives Sunday at 9pm."
              : "The first arrives on the 1st of the month."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          <aside>
            <div className="text-xs uppercase tracking-widest text-text-muted font-mono mb-3">
              History
            </div>
            <div className="space-y-1">
              {digests.map((d) => (
                <button
                  key={d._id}
                  onClick={() => setActiveId(d._id)}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                    active?._id === d._id
                      ? "bg-bg-elevated text-text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
                  }`}
                >
                  <div className="font-mono text-xs">
                    {formatShortDate(d.periodStart)}
                    <span className="mx-1">–</span>
                    {formatShortDate(d.periodEnd)}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {d.entryCount} entries
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <AnimatePresence mode="wait">
            {active && (
              <motion.article
                key={active._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-border bg-bg-surface p-8"
              >
                <div className="text-xs uppercase tracking-widest text-accent font-mono mb-2">
                  {type === "weekly" ? "Weekly digest" : "Monthly letter"}
                </div>
                <div className="text-text-secondary text-sm mb-6 font-mono">
                  {formatShortDate(active.periodStart)} —{" "}
                  {formatShortDate(active.periodEnd)} ·{" "}
                  {active.entryCount} entries · {active.wordCount.toLocaleString()} words
                </div>
                <div className="prose prose-invert max-w-none">
                  {active.content.split(/\n\s*\n/).map((para, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 * i, duration: 0.2 }}
                      className="text-text-primary text-[16px] leading-[1.85] mb-4 last:mb-0"
                    >
                      {para}
                    </motion.p>
                  ))}
                </div>
              </motion.article>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
