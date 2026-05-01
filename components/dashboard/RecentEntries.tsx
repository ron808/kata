"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatShortDate } from "@/lib/utils/dates";
import type { Entry } from "@/lib/types";

export function RecentEntries({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-text-muted text-sm py-8 text-center">
        No entries yet. Your first one is waiting.
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {entries.map((e, i) => {
        const longText = e.fields.find(
          (f) => f.type === "long_text" && typeof f.value === "string"
        );
        const preview =
          typeof longText?.value === "string"
            ? longText.value.slice(0, 80)
            : e.fields.find(
                (f) => typeof f.value === "string" && f.value
              )?.value as string | undefined ?? "—";
        return (
          <motion.div
            key={e._id ?? i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.18 }}
          >
            <Link
              href={e._id ? `/entry/${e._id}` : "/entry/new"}
              className="group flex items-center gap-4 rounded-xl border border-border bg-bg-surface px-4 py-3 hover:border-border-strong transition-colors"
            >
              <div className="text-xs text-text-muted font-mono w-24 shrink-0">
                {formatShortDate(e.date)}
              </div>
              <div className="flex-1 min-w-0 text-sm text-text-secondary group-hover:text-text-primary transition-colors truncate">
                {preview}
                {typeof preview === "string" && preview.length === 80 && "…"}
              </div>
              <div className="text-xs text-text-muted font-mono shrink-0">
                {e.wordCount}w
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
