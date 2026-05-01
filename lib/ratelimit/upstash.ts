import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

function make(limit: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
  });
}

export const limiters = {
  register: make(3, "1 h"),
  login: make(10, "15 m"),
  entryCreate: make(5, "1 d"),
  general: make(120, "1 m"),
};

export async function checkLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ ok: boolean; reset?: number }> {
  if (!limiter) return { ok: true };
  const res = await limiter.limit(identifier);
  return { ok: res.success, reset: res.reset };
}

export function clientIdentifier(req: Request, fallback = "anon"): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return fallback;
}
