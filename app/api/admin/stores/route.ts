import { desc, eq, or } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { createNotification } from "../../../../db/notifications";
import { stores, userProfiles } from "../../../../db/schema";
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
  const rows = await getDb().select({ store: stores, profileStatus: userProfiles.status })
    .from(stores)
    .leftJoin(userProfiles, eq(stores.ownerId, userProfiles.userId))
    .where(or(eq(stores.status, "pending_verification"), eq(stores.status, "rejected")))
    .orderBy(desc(stores.id));
  return Response.json({ stores: rows.map((row) => ({ ...row.store, profileStatus: row.profileStatus ?? "missing" })) });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { storeId?: number; decision?: "approve" | "reject" };
  const storeId = Number(body.storeId);
  if (!Number.isInteger(storeId) || !body.decision) return Response.json({ error: "Negocio y decisión son obligatorios." }, { status: 400 });

  const db = getDb();
  const [row] = await db.select({ store: stores, profileStatus: userProfiles.status })
    .from(stores)
    .leftJoin(userProfiles, eq(stores.ownerId, userProfiles.userId))
    .where(eq(stores.id, storeId)).limit(1);
  if (!row) return Response.json({ error: "Negocio no encontrado." }, { status: 404 });
  if (body.decision === "approve" && row.profileStatus !== "approved") return Response.json({ error: "Aprueba primero el perfil KYC del propietario." }, { status: 409 });

  const status = body.decision === "approve" ? "verified" : "rejected";
  await db.update(stores).set({ status }).where(eq(stores.id, storeId));
  await createNotification(db, {
    userId: row.store.ownerId,
    type: "store_reviewed",
    title: status === "verified" ? "Vitrina verificada" : "Vitrina requiere actualización",
    message: status === "verified" ? `Tu negocio ${row.store.name} fue verificado y ya puede mostrar el sello de confianza.` : `Tu negocio ${row.store.name} no fue aprobado. Revisa tus datos y solicita una nueva evaluación.`,
  });
  return Response.json({ ok: true, storeId, status });
}
