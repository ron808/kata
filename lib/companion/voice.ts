import type { IThread } from "@/lib/db/models/Thread";
import { complete, isGroqConfigured } from "@/lib/ai/groq";

/**
 * With Groq configured, Kata's planned check-in is rewritten into one or two
 * natural sentences using only the thread's facts. The planned text already
 * reads well and is what's used whenever the model is missing, slow or off.
 */

const SYSTEM = `You rewrite one check-in message from a quiet journaling companion, so it sounds natural.
Rules:
- One or two short sentences. Sentence case. No emoji, no exclamation marks, no greetings, no sign-off.
- Use only the facts given. Never add names, dates, numbers or details that aren't in the facts.
- Keep it a question if the original is a question, about the same thing.
- Reply with the rewritten message only.`;

const EMOJI = /\p{Extended_Pictographic}/u;

function acceptable(out: string, original: string): boolean {
  return (
    out.length > 0 &&
    out.length <= 240 &&
    !out.includes("!") &&
    !out.includes("\n") &&
    !EMOJI.test(out) &&
    (out.match(/[.?]/g) ?? []).length <= 3 &&
    (!original.endsWith("?") || out.endsWith("?"))
  );
}

export async function voiceCheckin(text: string, thread: IThread, streak: number): Promise<string> {
  if (!isGroqConfigured()) return text;
  const facts = {
    title: thread.title,
    kind: thread.kind,
    status: thread.status,
    nextStep: thread.nextStep || null,
    lastNote: thread.lastNote || null,
    streak: thread.kind === "habit" ? streak : null,
  };
  try {
    const completion = await complete(
      {
        temperature: 0.4,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Facts: ${JSON.stringify(facts)}\nMessage: ${text}` },
        ],
      },
      { timeout: 6000 }
    );
    const out = completion.choices[0]?.message?.content?.trim().replace(/^"|"$/g, "") ?? "";
    return acceptable(out, text) ? out : text;
  } catch {
    return text;
  }
}
