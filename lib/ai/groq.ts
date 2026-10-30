import Groq from "groq-sdk";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";

const apiKey = process.env.GROQ_API_KEY;

let cached: Groq | null = null;
export function groq() {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }
  if (!cached) cached = new Groq({ apiKey });
  return cached;
}

export function isGroqConfigured() {
  return Boolean(apiKey);
}

// The models a Groq key can use (checked 2026-10-29: Llama 3.3 70B has been retired).
// Free-tier limits are per model, about 1,000 requests a day and 8,000 tokens a minute
// each, so when one is busy the next in the list usually isn't.
/** Quick work: reading pages, short wording. */
export const FAST_MODELS = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];
/**
 * Maru's conversation, which acts through tools. gpt-oss calls them when it says it will (Qwen
 * without thinking often just says "Done."), and its tool definitions cost about a quarter fewer tokens.
 */
export const TOOL_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
/** Longer writing: the Sunday and monthly letters. */
export const WRITING_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];

// Qwen thinks out loud unless told not to; gpt-oss always reasons, and a little is plenty here.
const TUNING: Record<string, Pick<ChatCompletionCreateParamsNonStreaming, "reasoning_effort">> = {
  "qwen/qwen3.8-27b": { reasoning_effort: "none" },
  "openai/gpt-oss-120b": { reasoning_effort: "low" },
  "openai/gpt-oss-20b": { reasoning_effort: "low" },
};

/**
 * A rate limit, a retired model, an overloaded server, a timeout, or a tool call the model
 * got wrong (Groq checks them against the schema): the next model may do.
 */
function worthTryingNext(err: unknown): boolean {
  const e = err as { status?: number; error?: { error?: { code?: string } } } | null;
  const status = e?.status;
  if (status === 400 && e?.error?.error?.code === "tool_use_failed") return true;
  return status === undefined || status === 404 || status === 413 || status === 429 || status >= 500;
}

/** How long a rate limit asks us to wait, in ms. */
function retryAfter(err: unknown): number | null {
  const e = err as { status?: number; headers?: Headers | Record<string, string | undefined> } | null;
  if (e?.status !== 429 || !e.headers) return null;
  const raw = e.headers instanceof Headers ? e.headers.get("retry-after") : e.headers["retry-after"];
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

/**
 * One completion from the first model in the list that can take it. With `wait`, when every
 * model is out of its per-minute tokens for no longer than that, it waits once and tries the
 * list again: a few seconds' pause instead of "try again shortly".
 */
export async function complete(
  params: Omit<ChatCompletionCreateParamsNonStreaming, "model">,
  { models = FAST_MODELS, timeout = 8000, wait = 0 }: { models?: string[]; timeout?: number; wait?: number } = {}
): Promise<ChatCompletion> {
  let last: unknown = new Error("No Groq model to try");
  let soonest: number | null = null;
  for (const model of models) {
    try {
      return await groq().chat.completions.create({ ...TUNING[model], ...params, model }, { timeout, maxRetries: 0 });
    } catch (err) {
      last = err;
      if (!worthTryingNext(err)) throw err;
      const after = retryAfter(err);
      if (after !== null) soonest = Math.min(soonest ?? after, after);
    }
  }
  if (soonest !== null && soonest <= wait) {
    await new Promise((resolve) => setTimeout(resolve, soonest + 250));
    return complete(params, { models, timeout });
  }
  throw last;
}
