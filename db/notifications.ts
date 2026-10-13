import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { notificationPreferences, notifications } from "./schema";
import type { getDb } from "./index";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function createNotification(db: ReturnType<typeof getDb>, values: { userId: string; type: string; title: string; message: string; orderId?: number }) {
  const [notification] = await db.insert(notifications).values({ ...values, orderId: values.orderId ?? null }).returning({ id: notifications.id });
  if (!notification) return;
  const [preferences] = await db.select({ email: notificationPreferences.email, emailAddress: notificationPreferences.emailAddress }).from(notificationPreferences).where(eq(notificationPreferences.userId, values.userId)).limit(1);
  const emailEnv = env as unknown as { RESEND_API_KEY?: string; STREAMLOCK_EMAIL_FROM?: string };
  if (!preferences?.email || !preferences.emailAddress || !emailEnv.RESEND_API_KEY || !emailEnv.STREAMLOCK_EMAIL_FROM) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${emailEnv.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `notification-${notification.id}` },
      body: JSON.stringify({
        from: emailEnv.STREAMLOCK_EMAIL_FROM,
        to: [preferences.emailAddress],
        subject: `StreamLock · ${values.title}`,
        html: `<h2>${escapeHtml(values.title)}</h2><p>${escapeHtml(values.message)}</p>${values.orderId ? `<p>Pedido #${values.orderId}</p>` : ""}<p>Consulta los detalles dentro de StreamLock.</p>`,
      }),
    });
  } catch {
    // El aviso dentro de la aplicación ya quedó guardado; el email es un canal adicional.
  }
}
