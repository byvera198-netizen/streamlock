import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { stores, userProfiles } from "../../../db/schema";

const accountTypes = new Set(["buyer", "seller", "both"]);
const activeModes = new Set(["buyer", "seller"]);

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
    accountType: profile.accountType,
    activeMode: profile.activeMode,
    legalName: profile.legalName,
    idLast4: profile.idLast4,
    phone: profile.phone,
    phoneVerifiedAt: profile.phoneVerifiedAt,
    address: profile.address,
    identityDocumentType: profile.identityDocumentType,
    identityDocumentSubmittedAt: profile.identityDocumentSubmittedAt,
    hasIdentityDocument: Boolean(profile.identityDocumentKey),
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
  const db = getDb();
  const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const form = isMultipart ? await request.formData() : null;
  const body = isMultipart ? {
    legalName: form?.get("legalName"),
    accountType: form?.get("accountType"),
    activeMode: form?.get("activeMode"),
    idNumber: form?.get("idNumber"),
    phone: form?.get("phone"),
    address: form?.get("address"),
    identityDocument: form?.get("identityDocument"),
  } : { ...(await request.json() as Record<string, unknown>), identityDocument: null };
  const legalName = typeof body.legalName === "string" ? body.legalName.trim().replace(/\s+/g, " ") : "";
  const requestedAccountType = typeof body.accountType === "string" ? body.accountType : existing?.accountType ?? "buyer";
  const accountType = accountTypes.has(requestedAccountType) ? requestedAccountType : "buyer";
  const requestedActiveMode = typeof body.activeMode === "string" ? body.activeMode : existing?.activeMode ?? "buyer";
  const activeMode = activeModes.has(requestedActiveMode) && (requestedActiveMode === "buyer" || accountType !== "buyer") ? requestedActiveMode : "buyer";
  const idNumber = normalizeId(typeof body.idNumber === "string" ? body.idNumber.trim() : "");
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone.trim() : "");
  const address = typeof body.address === "string" ? body.address.trim().replace(/\s+/g, " ") : "";
  const identityDocument = body.identityDocument instanceof File && body.identityDocument.size > 0 ? body.identityDocument : null;
  const identityIsValid = idNumber.length >= 6 && idNumber.length <= 20;
  const allowedDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (legalName.length < 5 || (!existing && !identityIsValid) || (idNumber && !identityIsValid) || phone.length < 7 || address.length < 10) {
    return Response.json({ error: "Completa nombre legal, identificación, teléfono y dirección con datos válidos." }, { status: 400 });
  }
  if (!identityDocument && !existing?.identityDocumentKey) {
    return Response.json({ error: "Adjunta una imagen o PDF de tu documento de identidad para enviar el perfil a revisión." }, { status: 400 });
  }
  if (identityDocument && (!allowedDocumentTypes.has(identityDocument.type) || identityDocument.size > 5 * 1024 * 1024)) {
    return Response.json({ error: "El documento debe ser PDF, JPG, PNG o WebP de máximo 5 MB." }, { status: 400 });
  }
  if (identityDocument && !env.RECEIPTS) {
    return Response.json({ error: "El almacenamiento seguro de documentos aún no está disponible." }, { status: 503 });
  }

  if (accountType === "buyer" && requestedActiveMode === "seller") {
    return Response.json({ error: "Una cuenta de cliente comprador no puede activar el modo vendedor." }, { status: 400 });
  }
  if (accountType === "buyer") {
    const [ownedStore] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, user.userId)).limit(1);
    if (ownedStore) return Response.json({ error: "Esta cuenta ya tiene una vitrina. Selecciona Cliente y vendedor para conservar el acceso a tu negocio." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const phoneChanged = existing ? existing.phone !== phone : true;
  let identityDocumentKey = existing?.identityDocumentKey ?? null;
  let identityDocumentType = existing?.identityDocumentType ?? null;
  let identityDocumentSubmittedAt = existing?.identityDocumentSubmittedAt ?? null;
  if (identityDocument) {
    const extension = identityDocument.type === "application/pdf" ? "pdf" : identityDocument.type.split("/")[1] ?? "bin";
    identityDocumentKey = `kyc-documents/${user.userId}/${crypto.randomUUID()}.${extension}`;
    identityDocumentType = identityDocument.type;
    identityDocumentSubmittedAt = now;
    await env.RECEIPTS.put(identityDocumentKey, identityDocument.stream(), { httpMetadata: { contentType: identityDocument.type } });
  }
  const values = { userId: user.userId, accountType, activeMode, legalName, idNumberHash: idNumber ? await hashIdentity(idNumber) : existing?.idNumberHash ?? "", idLast4: idNumber ? idNumber.slice(-4) : existing?.idLast4 ?? "", phone, phoneVerifiedAt: phoneChanged ? null : existing?.phoneVerifiedAt ?? null, phoneVerificationCodeHash: phoneChanged ? null : existing?.phoneVerificationCodeHash ?? null, phoneVerificationExpiresAt: phoneChanged ? null : existing?.phoneVerificationExpiresAt ?? null, phoneVerificationLastSentAt: phoneChanged ? null : existing?.phoneVerificationLastSentAt ?? null, phoneVerificationAttempts: phoneChanged ? 0 : existing?.phoneVerificationAttempts ?? 0, address, identityDocumentKey, identityDocumentType, identityDocumentSubmittedAt, status: "pending_review", updatedAt: now };
  const [profile] = existing
    ? await db.update(userProfiles).set(values).where(eq(userProfiles.userId, user.userId)).returning()
    : await db.insert(userProfiles).values(values).returning();
  if (existing?.identityDocumentKey && identityDocumentKey && existing.identityDocumentKey !== identityDocumentKey) {
    try { await env.RECEIPTS.delete(existing.identityDocumentKey); } catch { /* La nueva copia ya está protegida; limpieza posterior */ }
  }
  return Response.json({ profile: safeProfile(profile), message: identityDocument ? "Perfil y documento recibidos. Tu identidad queda pendiente de revisión." : "Perfil guardado. Tu identidad queda pendiente de revisión básica." }, { status: existing ? 200 : 201 });
}
