import type { KeyboardEvent } from "react";

/**
 * Arrow keys for a group of role="radio" buttons, as in a native radio group:
 * one tab stop, arrows move and choose, Home and End jump to the ends.
 */
export function radioKeys<T>(options: readonly T[], current: T | null, choose: (v: T) => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !back && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = current === null ? -1 : options.indexOf(current);
    const last = options.length - 1;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? last : forward ? (i < 0 ? 0 : i === last ? 0 : i + 1) : i <= 0 ? last : i - 1;
    choose(options[next]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };
}

/** The radio that takes the tab stop: the chosen one, or the first when nothing is chosen yet. */
export function tabStop(checked: boolean, index: number, anyChecked: boolean): 0 | -1 {
  return checked || (!anyChecked && index === 0) ? 0 : -1;
}
