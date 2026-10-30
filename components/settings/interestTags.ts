import { QUESTION_BANK } from "@/lib/questions/bank";
import { ROLE_PRESETS } from "@/lib/roles";

// Server-side helper: the topics Kata actually has questions for, so interest chips only
// offer what steers the questions. Role tags are left out; those follow from what you do.
// Pass the result to client components rather than importing the bank into the browser.

const ROLE_TAGS = new Set<string>(ROLE_PRESETS.map((r) => r.key));

export const INTEREST_TAGS: string[] = [...new Set<string>(QUESTION_BANK.flatMap((q) => q.tags))].filter(
  (t) => !ROLE_TAGS.has(t)
);
