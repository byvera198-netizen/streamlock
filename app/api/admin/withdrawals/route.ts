import { and, desc, eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { balanceTransactions, payoutAccounts, sellerBalances, withdrawals } from "../../../../db/schema";
import { createNotification } from "../../../../db/notifications";
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
  const items = await getDb().select({ id: withdrawals.id, ownerId: withdrawals.ownerId, payoutAccountId: withdrawals.payoutAccountId, amountCents: withdrawals.amountCents, method: withdrawals.method, destination: withdrawals.destination, status: withdrawals.status, reviewedAt: withdrawals.reviewedAt, createdAt: withdrawals.createdAt, payoutBankName: payoutAccounts.bankName, payoutAccountLast4: payoutAccounts.accountNumberLast4, payoutAccountStatus: payoutAccounts.status }).from(withdrawals).leftJoin(payoutAccounts, eq(withdrawals.payoutAccountId, payoutAccounts.id)).where(eq(withdrawals.status, "pending_review")).orderBy(desc(withdrawals.id));
  return Response.json({ withdrawals: items });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { withdrawalId?: number; decision?: "approve" | "reject" };
  const id = Number(body.withdrawalId);
  if (!Number.isInteger(id) || !body.decision) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  const db = getDb();
  const [item] = await db.select().from(withdrawals).where(and(eq(withdrawals.id, id), eq(withdrawals.status, "pending_review"))).limit(1);
  if (!item) return Response.json({ error: "Retiro no encontrado o ya revisado." }, { status: 404 });
  const now = new Date().toISOString();
  const [processed] = await db.update(withdrawals).set({ status: body.decision === "approve" ? "paid" : "rejected", reviewedAt: now }).where(and(eq(withdrawals.id, id), eq(withdrawals.status, "pending_review"))).returning({ id: withdrawals.id });
  if (!processed) return Response.json({ error: "El retiro ya fue procesado por otro administrador." }, { status: 409 });
  if (body.decision === "reject") {
    await db.update(sellerBalances).set({ availableCents: sql`${sellerBalances.availableCents} + ${item.amountCents}`, updatedAt: now }).where(eq(sellerBalances.ownerId, item.ownerId));
    await db.insert(balanceTransactions).values({ ownerId: item.ownerId, type: "withdrawal_rejected", amountCents: item.amountCents, feeCents: 0 });
  } else {
    await db.insert(balanceTransactions).values({ ownerId: item.ownerId, type: "withdrawal_paid", amountCents: 0, feeCents: 0 });
  }
  await createNotification(db, {
    userId: item.ownerId,
    type: body.decision === "approve" ? "withdrawal_paid" : "withdrawal_rejected",
    title: body.decision === "approve" ? "Retiro pagado" : "Retiro rechazado",
    message: body.decision === "approve" ? `Tu retiro de $${(item.amountCents / 100).toFixed(2)} fue marcado como pagado.` : `Tu retiro de $${(item.amountCents / 100).toFixed(2)} fue rechazado y el saldo fue devuelto.`,
  });
  return Response.json({ ok: true, status: body.decision === "approve" ? "paid" : "rejected" });
}
