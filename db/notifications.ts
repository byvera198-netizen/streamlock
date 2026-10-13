import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { notificationPreferences, notifications } from "./schema";
import type { getDb } from "./index";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function createNotification(db: ReturnType<typeof getDb>, values: { userId: string; type: string; title: string; message: string; orderId?: number }) {
  const [notification] = await db.insert(notifications).values({ ...values, orderId: values.orderId ?? null, createdAt: new Date().toISOString() }).returning({ id: notifications.id });
  if (!notification) return;
  const [preferences] = await db.select({ email: notificationPreferences.email, emailAddress: notificationPreferences.emailAddress }).from(notificationPreferences).where(eq(notificationPreferences.userId, values.userId)).limit(1);
  const emailEnv = env as unknown as { RESEND_API_KEY?: string; STREAMLOCK_EMAIL_FROM?: string; STREAMLOCK_PUBLIC_URL?: string };
  if (!preferences?.email || !preferences.emailAddress || !emailEnv.RESEND_API_KEY || !emailEnv.STREAMLOCK_EMAIL_FROM) return;
  try {
    const publicUrl = (emailEnv.STREAMLOCK_PUBLIC_URL?.trim() || "https://streamlock.profebyron.workers.dev").replace(/\/+$/, "");
    const appUrl = `${publicUrl}/`;
    const orderLabel = values.orderId ? `Pedido #${values.orderId}` : "Actividad de tu cuenta";
    const safeTitle = escapeHtml(values.title);
    const safeMessage = escapeHtml(values.message);
    const safeAppUrl = escapeHtml(appUrl);
    const text = `${values.title}\n\n${values.message}\n\n${orderLabel}\n\nAbre StreamLock: ${appUrl}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${emailEnv.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `notification-${notification.id}` },
      body: JSON.stringify({
        from: emailEnv.STREAMLOCK_EMAIL_FROM,
        to: [preferences.emailAddress],
        subject: `StreamLock · ${values.title.replace(/[\r\n]/g, " ").slice(0, 120)}`,
        text,
        html: `<!doctype html><html lang="es"><body style="margin:0;background:#f7f4ee;color:#13201f;font-family:Arial,sans-serif;padding:32px 16px"><main style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e1e1da;border-radius:18px;padding:28px"><p style="margin:0 0 20px;color:#f2654c;font-weight:700;letter-spacing:.08em">STREAMLOCK</p><h2 style="margin:0 0 14px;font-size:24px">${safeTitle}</h2><p style="line-height:1.6;color:#46514c">${safeMessage}</p><p style="color:#69746e;font-size:13px">${orderLabel}</p><a href="${safeAppUrl}" style="display:inline-block;margin-top:12px;padding:12px 18px;border-radius:999px;background:#13201f;color:#fff;text-decoration:none;font-weight:700">Abrir StreamLock</a><p style="margin:24px 0 0;color:#69746e;font-size:12px">Este aviso fue generado automáticamente por StreamLock.</p></main></body></html>`,
      }),
    });
  } catch {
    // El aviso dentro de la aplicación ya quedó guardado; el email es un canal adicional.
  }
}
