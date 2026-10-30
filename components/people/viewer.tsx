"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

/*
 * PeopleProvider — tells the people parts whether the viewer has a handle yet, so following,
 * reacting, replying and sharing can ask for one before trying instead of after a refusal.
 *
 *   <PeopleProvider handle={me.handle} suggested={me.suggestedHandle}>…</PeopleProvider>
 *
 * Optional: without it the parts find out from the API's 403 and ask then. A handle claimed
 * anywhere on the page is remembered here at once, so every part knows.
 */

interface Viewer {
  handle: string | null;
  suggested?: string;
}

const ViewerContext = createContext<Viewer | null>(null);

let claimed: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Call once a handle is saved. Client only (event handlers), never during render. */
export function rememberHandle(handle: string) {
  claimed = handle;
  listeners.forEach((l) => l());
}

export function PeopleProvider({
  handle,
  suggested,
  children,
}: {
  handle: string | null;
  suggested?: string;
  children: ReactNode;
}) {
  return <ViewerContext.Provider value={{ handle, suggested }}>{children}</ViewerContext.Provider>;
}

/** The viewer's handle; null if they have none yet; undefined if nobody said (no provider). */
export function useViewerHandle(): string | null | undefined {
  const fresh = useSyncExternalStore(subscribe, () => claimed, () => null);
  const viewer = useContext(ViewerContext);
  return fresh ?? (viewer ? viewer.handle : undefined);
}

export function useSuggestedHandle(): string | undefined {
  return useContext(ViewerContext)?.suggested;
}
