import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { sendSupportEmail } from "../../../email";

export async function POST() {
  const user = await getChatGPTUser();
  const configuredEmail = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) return Response.json({ error: "El correo administrativo aún no está configurado." }, { status: 503 });
  if (!user || user.email.toLowerCase() !== configuredEmail) return Response.json({ error: "No autorizado." }, { status: 403 });

  const sent = await sendSupportEmail(
    "StreamLock · Prueba de correo",
    "<p>Este es un correo de prueba de StreamLock.</p><p>La configuración de notificaciones administrativas está activa.</p>",
    `admin-email-test/${Date.now()}`,
  );
  return sent
    ? Response.json({ ok: true, message: "Correo de prueba enviado." })
    : Response.json({ error: "El proveedor de correo no confirmó el envío." }, { status: 502 });
}
