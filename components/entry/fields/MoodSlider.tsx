"use client";

import { motion } from "framer-motion";
import type { TemplateField } from "@/lib/types";

const DEFAULT_EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];

export function MoodSlider({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: number | null;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  const emojis = (field.config.emojis as string[] | undefined) ?? DEFAULT_EMOJIS;

  return (
    <div className="flex items-center gap-2">
      {emojis.map((e, i) => {
        const level = i + 1;
        const active = value === level;
        return (
          <motion.button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(level)}
            whileTap={{ scale: 0.92 }}
            className={`relative grid place-items-center w-12 h-12 rounded-xl text-2xl transition-all ${
              active
                ? "bg-accent/10 border border-accent/60 scale-110"
                : "bg-bg-elevated/40 border border-border hover:border-border-strong opacity-60 hover:opacity-100"
            }`}
            aria-label={`Mood level ${level}`}
          >
            {e}
          </motion.button>
        );
      })}
    </div>
  );
}
