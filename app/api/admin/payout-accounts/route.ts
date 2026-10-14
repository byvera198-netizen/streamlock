import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { createNotification } from "../../../../db/notifications";
import { payoutAccounts } from "../../../../db/schema";
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
  const accounts = await getDb().select({ id: payoutAccounts.id, ownerId: payoutAccounts.ownerId, bankName: payoutAccounts.bankName, accountType: payoutAccounts.accountType, accountHolderName: payoutAccounts.accountHolderName, accountNumberLast4: payoutAccounts.accountNumberLast4, status: payoutAccounts.status, createdAt: payoutAccounts.createdAt, updatedAt: payoutAccounts.updatedAt })
    .from(payoutAccounts).orderBy(desc(payoutAccounts.id));
  return Response.json({ accounts });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { accountId?: number; decision?: "approve" | "reject" };
  const accountId = Number(body.accountId);
  if (!Number.isInteger(accountId) || !body.decision) return Response.json({ error: "Cuenta y decisión son obligatorias." }, { status: 400 });
  const db = getDb();
  const [account] = await db.select().from(payoutAccounts).where(and(eq(payoutAccounts.id, accountId), eq(payoutAccounts.status, "pending_review"))).limit(1);
  if (!account) return Response.json({ error: "Cuenta no encontrada o ya revisada." }, { status: 404 });
  const status = body.decision === "approve" ? "approved" : "rejected";
  const [updated] = await db.update(payoutAccounts).set({ status, updatedAt: new Date().toISOString() }).where(and(eq(payoutAccounts.id, accountId), eq(payoutAccounts.status, "pending_review"))).returning({ id: payoutAccounts.id });
  if (!updated) return Response.json({ error: "La cuenta ya fue procesada por otro administrador." }, { status: 409 });
  await createNotification(db, { userId: account.ownerId, type: "payout_account_reviewed", title: status === "approved" ? "Cuenta de retiro aprobada" : "Cuenta de retiro rechazada", message: status === "approved" ? `Tu cuenta de retiro en ${account.bankName} terminada en ****${account.accountNumberLast4} fue aprobada.` : `Tu cuenta de retiro en ${account.bankName} requiere actualización.` });
  await recordAuditEvent({ actorId: access.user.userId, action: "admin_payout_account_review", targetType: "payout_account", targetId: String(accountId), metadata: { decision: body.decision, status } });
  return Response.json({ ok: true, accountId, status });
}
