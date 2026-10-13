import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { userProfiles } from "../../../../../db/schema";
import { hashPhoneCode } from "../../../../whatsapp";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para verificar tu teléfono." }, { status: 401 });
  const body = await request.json() as { code?: string };
  const code = body.code?.replace(/\D/g, "") ?? "";
  if (!/^\d{6}$/.test(code)) return Response.json({ error: "Ingresa el código de 6 dígitos." }, { status: 400 });

  const db = getDb();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  if (!profile?.phoneVerificationCodeHash || !profile.phoneVerificationExpiresAt) return Response.json({ error: "Solicita primero un código de verificación." }, { status: 400 });
  if (profile.phoneVerificationAttempts >= 5) return Response.json({ error: "Se alcanzó el límite de intentos. Solicita un nuevo código." }, { status: 429 });
  if (Date.parse(profile.phoneVerificationExpiresAt) <= Date.now()) return Response.json({ error: "El código expiró. Solicita uno nuevo." }, { status: 400 });

  const expectedHash = await hashPhoneCode(user.userId, code, profile.phoneVerificationExpiresAt);
  if (expectedHash !== profile.phoneVerificationCodeHash) {
    await db.update(userProfiles).set({ phoneVerificationAttempts: profile.phoneVerificationAttempts + 1 }).where(eq(userProfiles.userId, user.userId));
    return Response.json({ error: "El código no coincide." }, { status: 400 });
  }

  await db.update(userProfiles).set({ phoneVerifiedAt: new Date().toISOString(), phoneVerificationCodeHash: null, phoneVerificationExpiresAt: null, phoneVerificationAttempts: 0 }).where(eq(userProfiles.userId, user.userId));
  return Response.json({ message: "Teléfono verificado correctamente." });
}
