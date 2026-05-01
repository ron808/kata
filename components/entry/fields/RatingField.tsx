"use client";

import { motion } from "framer-motion";

export function RatingField({
  value,
  onChange,
  readOnly,
}: {
  value: number | null;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (value ?? 0) >= n;
        return (
          <motion.button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(n)}
            whileTap={{ scale: 0.85 }}
            className="grid place-items-center w-9 h-9"
            aria-label={`${n} stars`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-7 h-7 transition-colors ${
                filled ? "text-warning" : "text-text-muted"
              }`}
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M12 2l2.9 6.5 7.1.7-5.4 4.9 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.7L12 2z" />
            </svg>
          </motion.button>
        );
      })}
    </div>
  );
}
