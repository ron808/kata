"use client";

import { motion } from "framer-motion";
import type { TemplateField } from "@/lib/types";

export function YesNoField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: TemplateField;
  value: boolean | null;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  const yesLabel = (field.config?.yesLabel as string) ?? "Yes";
  const noLabel = (field.config?.noLabel as string) ?? "No";
  return (
    <div className="grid grid-cols-2 gap-2 max-w-md">
      {[
        { val: true, label: yesLabel, color: "success" },
        { val: false, label: noLabel, color: "danger" },
      ].map((b) => {
        const active = value === b.val;
        return (
          <motion.button
            key={String(b.val)}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(b.val)}
            whileTap={{ scale: 0.97 }}
            className={`rounded-xl py-3 font-medium transition-all ${
              active
                ? b.color === "success"
                  ? "bg-success/10 border border-success/50 text-success"
                  : "bg-danger/10 border border-danger/50 text-danger"
                : "bg-bg-elevated/40 border border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
            }`}
          >
            {b.label}
          </motion.button>
        );
      })}
    </div>
  );
}
