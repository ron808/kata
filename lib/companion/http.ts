import { handleError, jsonError } from "@/lib/api";
import { CompanionError } from "./errors";

export function companionError(err: unknown) {
  if (err instanceof CompanionError) return jsonError(err.message, err.status);
  return handleError(err);
}
