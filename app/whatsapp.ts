import { env } from "cloudflare:workers";

type WhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
};

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const apiVersion = env.WHATSAPP_API_VERSION?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim();
  const templateName = env.WHATSAPP_OTP_TEMPLATE_NAME?.trim();
  const templateLanguage = env.WHATSAPP_OTP_TEMPLATE_LANGUAGE?.trim();
  if (!apiVersion || !phoneNumberId || !accessToken || !templateName || !templateLanguage) return null;
  return { apiVersion, phoneNumberId, accessToken, templateName, templateLanguage };
}

export function isWhatsAppOtpRequired() {
  return env.WHATSAPP_OTP_REQUIRED?.trim().toLowerCase() === "true";
}

export async function sendWhatsAppOtp(to: string, code: string) {
  const config = getWhatsAppConfig();
  if (!config) return { configured: false as const };
  try {
    const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("WhatsApp Cloud API error", response.status, detail.slice(0, 500));
      return { configured: true as const, sent: false as const };
    }
    return { configured: true as const, sent: true as const };
  } catch (error) {
    console.error("WhatsApp Cloud API request failed", error instanceof Error ? error.name : "unknown");
    return { configured: true as const, sent: false as const };
  }
}

export function normalizeWhatsAppPhone(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!/^\+5939\d{8}$/.test(compact)) return null;
  return compact;
}

export async function hashPhoneCode(userId: string, code: string, expiresAt: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${code}:${expiresAt}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
