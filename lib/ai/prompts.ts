import type { IEntry } from "@/lib/db/models/Entry";

function serializeEntries(entries: IEntry[]): string {
  return entries
    .map((e) => {
      const date = new Date(e.date).toISOString().slice(0, 10);
      const body = e.fields
        .map((f) => {
          const v = Array.isArray(f.value) ? f.value.join(", ") : String(f.value ?? "");
          return `  ${f.label}: ${v}`;
        })
        .join("\n");
      return `[${date}]\n${body}`;
    })
    .join("\n\n");
}

export function weeklyPrompt(args: {
  name: string;
  role: string;
  entries: IEntry[];
}) {
  return {
    system: `You are a thoughtful journaling companion. You read a user's recent journal entries and write a concise weekly digest. Be honest, warm, and observational. Notice patterns. Do not be generic. Never use bullet points in your response. Write in flowing paragraphs. Maximum 250 words.`,
    user: `Here are the journal entries from the past 7 days for a ${args.role} named ${args.name}.
Each entry includes date and their responses to their daily prompts.

${serializeEntries(args.entries)}

Write their weekly digest. Start with what you noticed about their week. Then mention one pattern or recurring theme. End with one gentle observation or question for them to reflect on.`,
  };
}

export function monthlyPrompt(args: {
  name: string;
  role: string;
  month: string;
  year: number;
  entries: IEntry[];
}) {
  return {
    system: `You are writing a reflective monthly letter to a journaler. Read their entire month of entries and write a personal, honest letter addressed to them. Write as if you are their journal speaking back to them. Maximum 400 words. No bullet points. Warm but not saccharine.`,
    user: `Name: ${args.name}
Role: ${args.role}
Month: ${args.month} ${args.year}

Entries:
${serializeEntries(args.entries)}

Write the monthly letter. Begin with what this month seemed to be about for them. Reference specific things they wrote (without quoting verbatim). End with something forward-looking — what might next month hold based on where they are now.`,
  };
}
