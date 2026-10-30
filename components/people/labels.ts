import type { MomentKind, ReactionKind } from "@/lib/types";

/** How a moment's kind reads wherever it's shown. */
export const MOMENT_LABEL: Record<MomentKind, string> = {
  win: "Win",
  ship: "Shipped",
  thought: "Thought",
  question: "Question",
  milestone: "Milestone",
  page: "From a page",
};

/** The kinds the composer offers, in order. Milestones and lines from a page come from elsewhere. */
export const SHARE_KINDS = ["win", "ship", "thought", "question"] as const satisfies readonly MomentKind[];

export const REACTIONS: readonly { kind: ReactionKind; label: string }[] = [
  { kind: "nice", label: "Nice" },
  { kind: "same", label: "Same" },
  { kind: "go", label: "Go on" },
  { kind: "hug", label: "Hug" },
];

export const REACTION_LABEL = Object.fromEntries(REACTIONS.map((r) => [r.kind, r.label])) as Record<ReactionKind, string>;

/**
 * The API's answer when an action needs a handle. Mirrors NEEDS_HANDLE in lib/social/handles,
 * which can't be imported here because it loads the User model.
 */
export const NEEDS_HANDLE = "Choose a handle first.";

/** A person's hue, kept inside the eight. */
export const hue8 = (hue: number) => ((hue % 8) + 8) % 8;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
