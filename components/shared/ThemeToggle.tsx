"use client";

import { useSyncExternalStore } from "react";
import { Icon, type IconName } from "./Icon";

type Theme = "system" | "light" | "dark";
const KEY = "kata-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Apply and remember a theme. Maru calls this too ("switch to dark mode"). */
export function setTheme(theme: Theme) {
  const root = document.documentElement;
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice still applies to this page view.
  }
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: "system", label: "System", icon: "system" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`scale inline-grid ${className}`}
    >
      {OPTIONS.map((o) => {
        const on = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(o.value)}
            className="scale-step scale-row min-w-11 px-3"
          >
            <Icon name={o.icon} className="h-4 w-4" />
            <span className="max-sm:sr-only">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
