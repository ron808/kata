import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

let cached: Groq | null = null;
export function groq() {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }
  if (!cached) cached = new Groq({ apiKey });
  return cached;
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export function isGroqConfigured() {
  return Boolean(apiKey);
}
