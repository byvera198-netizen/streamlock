import { env } from "cloudflare:workers";

type EmailEnv = { RESEND_API_KEY?: string; STREAMLOCK_EMAIL_FROM?: string; STREAMLOCK_ADMIN_EMAIL?: string };

export async function sendSupportEmail(subject: string, html: string, idempotencyKey: string) {
  const config = env as unknown as EmailEnv;
  if (!config.RESEND_API_KEY || !config.STREAMLOCK_EMAIL_FROM || !config.STREAMLOCK_ADMIN_EMAIL) return false;

  for (const delayMs of [0, 250, 750]) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ from: config.STREAMLOCK_EMAIL_FROM, to: [config.STREAMLOCK_ADMIN_EMAIL], subject, html }),
      });
      if (response.ok) return true;
    } catch {
      // A transient provider/network error is retried with the same idempotency key.
    }
  }

  return false;
}
