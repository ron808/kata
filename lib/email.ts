// Tiny email helper. Uses Resend's REST API directly so we don't need a new
// npm dependency. If RESEND_API_KEY isn't set, the helper logs the message
// instead so dev/local flows still work end-to-end.

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM = process.env.EMAIL_FROM ?? "Kata <onboarding@resend.dev>";
const API_KEY = process.env.RESEND_API_KEY;

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  if (!API_KEY) {
    console.warn(
      "[email] RESEND_API_KEY missing — email not sent. Logging instead.\n" +
        `  to: ${to}\n  subject: ${subject}\n  text: ${
          text ?? html.replace(/<[^>]+>/g, "").trim()
        }`
    );
    return { delivered: false, dev: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return { delivered: true, dev: false };
}

export function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
