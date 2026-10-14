import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { createNotification } from "../../../../db/notifications";
import { userProfiles } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { recordAuditEvent } from "../../../security-guard";

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
  const profiles = await getDb().select().from(userProfiles).where(eq(userProfiles.status, "pending_review")).orderBy(desc(userProfiles.updatedAt));
  return Response.json({ profiles });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { userId?: string; decision?: "approve" | "reject" };
  const userId = body.userId?.trim() ?? "";
  if (!userId || !body.decision) return Response.json({ error: "Perfil y decisión son obligatorios." }, { status: 400 });
  const db = getDb();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!profile) return Response.json({ error: "Perfil no encontrado." }, { status: 404 });
  const status = body.decision === "approve" ? "approved" : "rejected";
  await db.update(userProfiles).set({ status, updatedAt: new Date().toISOString() }).where(eq(userProfiles.userId, userId));
  await createNotification(db, {
    userId,
    type: "profile_reviewed",
    title: status === "approved" ? "Perfil aprobado" : "Perfil requiere actualización",
    message: status === "approved" ? "Tu perfil protegido fue aprobado. Ya puedes continuar con tus operaciones." : "Tu perfil protegido requiere revisión. Actualiza tus datos y vuelve a enviarlos.",
  });
  await recordAuditEvent({ actorId: access.user.userId, action: "admin_profile_review", targetType: "user_profile", targetId: userId, metadata: { decision: body.decision, status } });
  return Response.json({ ok: true, userId, status });
}
