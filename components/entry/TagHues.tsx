"use client";

import { createContext, useContext, type ReactNode } from "react";
import { hueForTag } from "./hue";

const TagHuesContext = createContext<Record<string, number> | undefined>(undefined);

/** Lets field components colour a tag by the thread that owns it. Without it, tags use their hash hue. */
export function TagHues({ hues, children }: { hues: Record<string, number>; children: ReactNode }) {
  return <TagHuesContext.Provider value={hues}>{children}</TagHuesContext.Provider>;
}

export function useTagHue(): (tag: string) => number {
  const hues = useContext(TagHuesContext);
  return (tag) => hueForTag(tag, hues);
}
