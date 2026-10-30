import { NEEDS_HANDLE } from "./labels";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; needsHandle: boolean };

const GENERIC = "That didn’t work. Try again.";

/** The failure in the caller's own words when the server gave no reason worth showing. */
export function failure(r: { error: string }, ours: string): string {
  return r.error === GENERIC ? ours : r.error;
}

/**
 * JSON in, JSON out, never throws (except an abort): failures come back as a sentence to show.
 * `needsHandle` is the 403 the social API sends when the viewer hasn't picked a handle yet.
 */
export async function api<T>(
  url: string,
  { method = "GET", body, signal }: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return { ok: false, status: 0, error: "Can’t reach Kata. Check your connection and try again.", needsHandle: false };
  }
  const json = (await res.json().catch(() => null)) as unknown;
  if (res.ok) return { ok: true, data: json as T };
  const said = json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string" ? (json as { error: string }).error : "";
  const error =
    res.status === 401
      ? "You’ve been signed out. Sign in again to carry on."
      : res.status === 429
        ? said || "That’s a lot at once. Try again in a minute."
        : said && said !== "Internal error" && said !== "Invalid request"
          ? said
          : GENERIC;
  return { ok: false, status: res.status, error, needsHandle: res.status === 403 && said === NEEDS_HANDLE };
}

export const isAbort = (err: unknown) => (err as Error)?.name === "AbortError";
