import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { userProfiles } from "../../../../../db/schema";
import { getWhatsAppConfig, hashPhoneCode, normalizeWhatsAppPhone, sendWhatsAppOtp } from "../../../../whatsapp";

function createCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para verificar tu teléfono." }, { status: 401 });
  if (!getWhatsAppConfig()) return Response.json({ error: "La verificación por WhatsApp es opcional y todavía no está disponible. Puedes continuar con tu perfil y tus compras protegidas." }, { status: 503 });

  const db = getDb();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  if (!profile) return Response.json({ error: "Completa primero tu perfil protegido." }, { status: 400 });
  const phone = normalizeWhatsAppPhone(profile.phone);
  if (!phone) return Response.json({ error: "El teléfono debe estar en formato ecuatoriano internacional, por ejemplo +593 9XXXXXXXX." }, { status: 400 });

  const now = Date.now();
  if (profile.phoneVerificationLastSentAt && now - Date.parse(profile.phoneVerificationLastSentAt) < 60_000) {
    return Response.json({ error: "Espera un minuto antes de solicitar otro código." }, { status: 429 });
  }
  const expiresAt = new Date(now + 10 * 60_000).toISOString();
  const code = createCode();
  const codeHash = await hashPhoneCode(user.userId, code, expiresAt);
  const result = await sendWhatsAppOtp(phone, code);
  if (!result.configured || !result.sent) return Response.json({ error: "No se pudo enviar el código de WhatsApp. Revisa la plantilla aprobada y las credenciales de Meta." }, { status: 502 });

  await db.update(userProfiles).set({ phoneVerificationCodeHash: codeHash, phoneVerificationExpiresAt: expiresAt, phoneVerificationLastSentAt: new Date(now).toISOString(), phoneVerificationAttempts: 0 }).where(eq(userProfiles.userId, user.userId));
  return Response.json({ message: "Código enviado por WhatsApp. Caduca en 10 minutos." });
}
