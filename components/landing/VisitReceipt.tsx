"use client";

import { useEffect, useState } from "react";

/** A small, true receipt: how fast this page painted on this visit, measured here. */
export function VisitReceipt() {
  const [lcp, setLcp] = useState<number | null>(null);
  const [cls, setCls] = useState(0);

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;
    const observers: PerformanceObserver[] = [];
    try {
      const l = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) setLcp(last.startTime);
      });
      l.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(l);
      const c = new PerformanceObserver((list) => {
        let add = 0;
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) add += e.value;
        }
        if (add) setCls((v) => v + add);
      });
      c.observe({ type: "layout-shift", buffered: true });
      observers.push(c);
    } catch {
      // Unsupported entry types (Safari has no LCP): say nothing.
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  if (lcp == null) return null;
  return (
    <p className="text-[0.8125rem] tabular-nums text-ink/68">
      Measured on this visit: first big paint {(lcp / 1000).toFixed(2)}s · layout shift {cls.toFixed(3)}
    </p>
  );
}
