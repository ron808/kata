"use client";

import { useEffect } from "react";

// The landing page is static and cached, so it can't know who's visiting. Signed-in
// visitors get "Open Kata" instead of "Start writing" from html[data-session="in"]
// (see StartLink): applied from the last known state as soon as this chunk runs, then
// confirmed against the session once the page is idle.

const KEY = "kata-session";

function mark(signedIn: boolean) {
  const root = document.documentElement;
  if (signedIn) root.dataset.session = "in";
  else delete root.dataset.session;
}

if (typeof window !== "undefined") {
  try {
    mark(localStorage.getItem(KEY) === "in");
  } catch {
    // Storage blocked: wait for the check.
  }
}

export function SessionCheck() {
  useEffect(() => {
    const ctrl = new AbortController();
    const check = () =>
      fetch("/api/auth/session", { signal: ctrl.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((session: { user?: unknown } | null) => {
          const signedIn = Boolean(session?.user);
          mark(signedIn);
          try {
            if (signedIn) localStorage.setItem(KEY, "in");
            else localStorage.removeItem(KEY);
          } catch {
            // Storage blocked: the page still shows the right links this time.
          }
        })
        .catch(() => {});

    const idle = typeof window.requestIdleCallback === "function";
    const id = idle ? window.requestIdleCallback(check, { timeout: 2500 }) : window.setTimeout(check, 800);
    return () => {
      ctrl.abort();
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
  return null;
}
