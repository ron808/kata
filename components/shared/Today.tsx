"use client";

import { useSyncExternalStore } from "react";
import { formatDate, type DateStyle } from "@/lib/utils/dates";

const subscribe = () => () => {};

/**
 * Today's date in the visitor's own time zone. The server renders a UTC date
 * (passed in as `initial`); after hydration the local date replaces it, which
 * only changes anything near midnight.
 */
export function Today({
  initial,
  style = "long",
  className,
}: {
  initial: string;
  style?: DateStyle;
  className?: string;
}) {
  const value = useSyncExternalStore(
    subscribe,
    () => formatDate(new Date(), style),
    () => initial
  );
  return <span className={className}>{value}</span>;
}
