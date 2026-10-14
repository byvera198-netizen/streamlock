import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function requireAdmin() {
  const user = await getChatGPTUser();
  const email = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || user.email.toLowerCase() !== email) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;

  const appSecretConfigured = Boolean(env.WHATSAPP_APP_SECRET?.trim());
  const verifyTokenConfigured = Boolean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim());
  const apiConfigured = Boolean(env.WHATSAPP_API_VERSION?.trim() && env.WHATSAPP_PHONE_NUMBER_ID?.trim());
  const accessTokenConfigured = Boolean(env.WHATSAPP_ACCESS_TOKEN?.trim());
  const templateNameConfigured = Boolean(env.WHATSAPP_OTP_TEMPLATE_NAME?.trim());
  const templateLanguageConfigured = Boolean(env.WHATSAPP_OTP_TEMPLATE_LANGUAGE?.trim());
  const otpConfigured = Boolean(
    apiConfigured &&
      accessTokenConfigured &&
      templateNameConfigured &&
      templateLanguageConfigured,
  );
  const missing = [
    !appSecretConfigured && "WHATSAPP_APP_SECRET",
    !verifyTokenConfigured && "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    !apiConfigured && "WHATSAPP_API_VERSION o WHATSAPP_PHONE_NUMBER_ID",
    !accessTokenConfigured && "WHATSAPP_ACCESS_TOKEN",
    !templateNameConfigured && "WHATSAPP_OTP_TEMPLATE_NAME",
    !templateLanguageConfigured && "WHATSAPP_OTP_TEMPLATE_LANGUAGE",
  ].filter((value): value is string => Boolean(value));

  let eventStoreReady = false;
  let eventCount = 0;
  let lastReceivedAt: string | null = null;
  if (env.DB) {
    try {
      const result = await env.DB
        .prepare("SELECT COUNT(*) AS count, MAX(received_at) AS last_received_at FROM whatsapp_webhook_events")
        .first<{ count: number; last_received_at: string | null }>();
      eventStoreReady = true;
      eventCount = Number(result?.count ?? 0);
      lastReceivedAt = result?.last_received_at ?? null;
    } catch {
      // The table is created lazily by the first valid webhook event.
    }
  }

  return Response.json({
    configured: appSecretConfigured && verifyTokenConfigured && apiConfigured,
    otpConfigured,
    missing,
    eventStoreReady,
    eventCount,
    lastReceivedAt,
    phoneNumberIdLast4: env.WHATSAPP_PHONE_NUMBER_ID?.trim().slice(-4) ?? null,
  });
}
