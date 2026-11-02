"use client";

import { useEffect, useState } from "react";

/**
 * The time, ticking every second, on the server's clock. It starts at `at`, so the first paint
 * matches what the server drew and timers agree whatever the device's clock says.
 */
export function useClock(at: string): number {
  const [now, setNow] = useState(() => Date.parse(at));
  useEffect(() => {
    const skew = Date.parse(at) - Date.now();
    const id = window.setInterval(() => setNow(Date.now() + skew), 1000);
    return () => window.clearInterval(id);
  }, [at]);
  return now;
}
