"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatLongDate } from "@/lib/utils/dates";
import type { Entry } from "@/lib/types";

export function QuickEntry({ todayEntry }: { todayEntry: Entry | null }) {
  if (!todayEntry) {
    return (
      <Link href="/entry/new" className="block group">
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="rounded-2xl border border-border-strong bg-gradient-to-br from-accent/10 via-bg-surface to-bg-surface p-8 transition-colors group-hover:border-accent"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-widest text-accent font-mono">
                Today
              </div>
              <h2 className="text-2xl font-semibold mt-2">
                {formatLongDate(new Date())}
              </h2>
              <p className="text-text-secondary mt-1.5 max-w-md">
                You haven&apos;t written today yet. Take a few minutes to
                capture what mattered.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-5 py-3 font-medium btn-glow">
              Write today&apos;s entry →
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  const longText = todayEntry.fields.find(
    (f) => f.type === "long_text" && typeof f.value === "string" && f.value
  );
  const preview =
    typeof longText?.value === "string"
      ? longText.value.slice(0, 240)
      : "Entry saved.";

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-success font-mono">
            ✓ Today, written
          </div>
          <h2 className="text-xl font-semibold mt-1">
            {formatLongDate(todayEntry.date)}
          </h2>
        </div>
        <Link
          href="/entry/new"
          className="text-sm text-accent hover:text-accent-hover"
        >
          Edit →
        </Link>
      </div>
      <p className="text-text-secondary mt-3 leading-relaxed">
        {preview}
        {preview.length === 240 && "…"}
      </p>
      <div className="flex items-center gap-3 mt-4 text-xs text-text-muted font-mono">
        <span>{todayEntry.wordCount.toLocaleString()} words</span>
        {todayEntry.tags.length > 0 && (
          <>
            <span>·</span>
            <span>{todayEntry.tags.slice(0, 3).join(", ")}</span>
          </>
        )}
      </div>
    </div>
  );
}
