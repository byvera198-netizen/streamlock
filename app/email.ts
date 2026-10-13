import { env } from "cloudflare:workers";

type EmailEnv = { RESEND_API_KEY?: string; STREAMLOCK_EMAIL_FROM?: string; STREAMLOCK_ADMIN_EMAIL?: string };

export async function sendSupportEmail(subject: string, html: string, idempotencyKey: string) {
  const config = env as unknown as EmailEnv;
  if (!config.RESEND_API_KEY || !config.STREAMLOCK_EMAIL_FROM || !config.STREAMLOCK_ADMIN_EMAIL) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ from: config.STREAMLOCK_EMAIL_FROM, to: [config.STREAMLOCK_ADMIN_EMAIL], subject, html }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
