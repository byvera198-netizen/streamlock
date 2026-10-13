import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { userProfiles } from "../../../db/schema";

function normalizeId(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, "").slice(0, 20);
}

async function hashIdentity(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeProfile(profile: typeof userProfiles.$inferSelect) {
  return {
    legalName: profile.legalName,
    idLast4: profile.idLast4,
    phone: profile.phone,
    address: profile.address,
    status: profile.status,
    updatedAt: profile.updatedAt,
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para consultar tu perfil." }, { status: 401 });
  const [profile] = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  return Response.json({ profile: profile ? safeProfile(profile) : null });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para completar tu perfil." }, { status: 401 });
  const body = await request.json() as { legalName?: string; idNumber?: string; phone?: string; address?: string };
  const legalName = body.legalName?.trim().replace(/\s+/g, " ") ?? "";
  const idNumber = normalizeId(body.idNumber?.trim() ?? "");
  const phone = normalizePhone(body.phone?.trim() ?? "");
  const address = body.address?.trim().replace(/\s+/g, " ") ?? "";
  const db = getDb();
  const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  const identityIsValid = idNumber.length >= 6 && idNumber.length <= 20;
  if (legalName.length < 5 || (!existing && !identityIsValid) || (idNumber && !identityIsValid) || phone.length < 7 || address.length < 10) {
    return Response.json({ error: "Completa nombre legal, identificación, teléfono y dirección con datos válidos." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const values = { userId: user.userId, legalName, idNumberHash: idNumber ? await hashIdentity(idNumber) : existing?.idNumberHash ?? "", idLast4: idNumber ? idNumber.slice(-4) : existing?.idLast4 ?? "", phone, address, status: "pending_review", updatedAt: now };
  const [profile] = existing
    ? await db.update(userProfiles).set(values).where(eq(userProfiles.userId, user.userId)).returning()
    : await db.insert(userProfiles).values(values).returning();
  return Response.json({ profile: safeProfile(profile), message: "Perfil guardado. Tu identidad queda pendiente de revisión básica." }, { status: existing ? 200 : 201 });
}
