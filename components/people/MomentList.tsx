"use client";

/**
 * MomentList — moments as a column of MomentCards that closes up when you delete one of yours;
 * `empty` shows once none are left (or there were none).
 *
 *   <MomentList moments={moments} empty={<EmptyNote>Nothing shared yet.</EmptyNote>} />
 *
 * Props: moments: MomentT[]; empty?: ReactNode; compact? (cards as .wells, for inside a card).
 */

import { useState, type ReactNode } from "react";
import type { MomentT } from "@/lib/types";
import { MomentCard } from "./MomentCard";

export function MomentList({ moments, empty = null, compact = false }: { moments: MomentT[]; empty?: ReactNode; compact?: boolean }) {
  const [gone, setGone] = useState<string[]>([]);
  const shown = moments.filter((m) => !gone.includes(m._id));
  if (!shown.length) return <>{empty}</>;
  return (
    <ol className={`grid grid-cols-1 ${compact ? "gap-3" : "gap-5"}`}>
      {shown.map((m) => (
        <li key={m._id}>
          <MomentCard moment={m} compact={compact} onDelete={(id) => setGone((g) => [...g, id])} />
        </li>
      ))}
    </ol>
  );
}
