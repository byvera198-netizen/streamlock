import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { sendSupportEmail } from "../../../email";
import { allowRateLimit, recordAuditEvent } from "../../../security-guard";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const configuredEmail = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) return Response.json({ error: "El correo administrativo aún no está configurado." }, { status: 503 });
  if (!user || user.email.toLowerCase() !== configuredEmail) return Response.json({ error: "No autorizado." }, { status: 403 });
  if (!(await allowRateLimit(request, "admin-email-test", user.userId, 3, 60 * 60 * 1000))) return Response.json({ error: "Límite de pruebas alcanzado. Intenta nuevamente más tarde." }, { status: 429 });

  const sent = await sendSupportEmail(
    "StreamLock · Prueba de correo",
    "<p>Este es un correo de prueba de StreamLock.</p><p>La configuración de notificaciones administrativas está activa.</p>",
    `admin-email-test/${Date.now()}`,
  );
  await recordAuditEvent({ actorId: user.userId, action: "admin_email_test", targetType: "email", metadata: { sent } });
  return sent
    ? Response.json({ ok: true, message: "Correo de prueba enviado." })
    : Response.json({ error: "El proveedor de correo no confirmó el envío." }, { status: 502 });
}
