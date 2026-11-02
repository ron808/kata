import { User } from "@/lib/db/models/User";

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;
export const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

export const HANDLE_TAKEN = "That handle is taken.";
export const NEEDS_HANDLE = "Choose a handle first.";
/** The same, where the writer needs telling why and where. */
export const NEEDS_PROFILE = "Pick a handle in Settings first, so there's a profile to show it on.";

export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Top-level routes in app/.
  "api",
  "dashboard",
  "digest",
  "entry",
  "forgot",
  "history",
  "lab",
  "login",
  "onboarding",
  "register",
  "reset",
  "settings",
  "templates",
  // Words that would read as Kata itself, or as a page of it.
  "about",
  "admin",
  "feed",
  "help",
  "kata",
  "looks",
  "me",
  "notifications",
  "null",
  "people",
  "privacy",
  "support",
  "terms",
  "threads",
  "undefined",
  "you",
]);

/** What people type: " @Rohit" is "rohit". */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/** Why a normalised handle can't be used, in words for the person typing it; null if it can. */
export function handleProblem(handle: string): string | null {
  if (handle.length < HANDLE_MIN) return `Handles need at least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `Handles can be at most ${HANDLE_MAX} characters.`;
  if (!HANDLE_PATTERN.test(handle)) return "Use only lowercase letters, numbers and underscores.";
  if (RESERVED_HANDLES.has(handle)) return "That handle is reserved.";
  return null;
}

export type HandleCheck = { ok: true; handle: string } | { ok: false; reason: string; taken: boolean };

/** Whether `userId` can claim `raw`. Their current handle counts as available. */
export async function checkHandle(raw: string, userId: string): Promise<HandleCheck> {
  const handle = normalizeHandle(raw);
  const problem = handleProblem(handle);
  if (problem) return { ok: false, reason: problem, taken: false };
  const owner = await User.exists({ handle, _id: { $ne: userId } });
  return owner ? { ok: false, reason: HANDLE_TAKEN, taken: true } : { ok: true, handle };
}

function withSuffix(base: string, suffix: string): string {
  return `${base.slice(0, HANDLE_MAX - suffix.length)}${suffix}`;
}

/** A free handle from a name: "rohit", then "rohit_2", "rohit_3"… */
export async function suggestHandle(name: string): Promise<string> {
  const words =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .match(/[a-z0-9]+/g) ?? [];
  let base = words[0] ?? "";
  if (base.length < HANDLE_MIN) base = words.join("_");
  if (base.length < HANDLE_MIN) base = base ? `${base}_writes` : "writer";
  base = base.slice(0, HANDLE_MAX);

  const candidates = [base, ...Array.from({ length: 19 }, (_, i) => withSuffix(base, `_${i + 2}`))].filter(
    (h) => !RESERVED_HANDLES.has(h)
  );
  const taken = new Set(
    (await User.find({ handle: { $in: candidates } }).select("handle").lean()).map((u) => u.handle)
  );
  const free = candidates.find((h) => !taken.has(h));
  if (free) return free;

  for (let attempt = 0; attempt < 5; attempt++) {
    const handle = withSuffix(base, `_${Math.floor(1000 + Math.random() * 9000)}`);
    if (!(await User.exists({ handle }))) return handle;
  }
  // Only a suggestion: claiming it checks again.
  return withSuffix(base, `_${Date.now().toString(36)}`);
}

/** The viewer's handle. Following, reacting, replying and sharing all need one. */
export async function handleOf(userId: string): Promise<string | null> {
  const user = await User.findById(userId).select("handle").lean();
  return user?.handle ?? null;
}
