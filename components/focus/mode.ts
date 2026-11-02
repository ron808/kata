import type { FocusTheme } from "@/lib/types";

/** Focus went on or off, or changed colour: the shell follows at once, before the server has answered. */
export const FOCUS_EVENT = "kata:focus";

export interface FocusChange {
  on?: boolean;
  theme?: FocusTheme;
}

export function focusChanged(change: FocusChange) {
  window.dispatchEvent(new CustomEvent<FocusChange>(FOCUS_EVENT, { detail: change }));
}
