"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { DigestSummary } from "@/lib/types";

export function DigestCard({ digest }: { digest: DigestSummary }) {
  const preview = digest.content
    .split(/\n\s*\n/)[0]
    .split(/(?<=[.?!])\s/)
    .slice(0, 2)
    .join(" ");
  const isWeekly = digest.type === "weekly";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl bg-bg-surface p-6 shimmer-border overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs uppercase tracking-widest text-accent font-mono">
          {isWeekly ? "Weekly digest" : "Monthly letter"}
        </span>
        {!digest.isRead && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        )}
      </div>
      <p className="text-text-primary text-[15px] leading-[1.75] line-clamp-3">
        {preview}
      </p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-text-muted font-mono">
          {digest.entryCount} entries · {digest.wordCount.toLocaleString()} words
        </span>
        <Link
          href={isWeekly ? "/digest/weekly" : "/digest/monthly"}
          className="text-sm text-accent hover:text-accent-hover"
        >
          Read full →
        </Link>
      </div>
    </motion.div>
  );
}
