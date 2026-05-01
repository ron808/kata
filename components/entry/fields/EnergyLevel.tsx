"use client";

import { motion } from "framer-motion";
import type { TemplateField } from "@/lib/types";

export function EnergyLevel({
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: number | null;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((level) => {
        const filled = (value ?? 0) >= level;
        return (
          <motion.button
            key={level}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(level)}
            whileTap={{ scale: 0.9 }}
            className="grid place-items-center w-10 h-10 rounded-lg transition-colors"
            aria-label={`Energy ${level}`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-6 h-6 transition-colors ${
                filled ? "text-accent" : "text-text-muted"
              }`}
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </motion.button>
        );
      })}
    </div>
  );
}
