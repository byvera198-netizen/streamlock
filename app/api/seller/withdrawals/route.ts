import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { balanceTransactions, payoutAccounts, sellerBalances, withdrawals } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { sendSupportEmail } from "../../../email";

export async function GET() {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para consultar tus retiros." }, { status: 401 });
  const db = getDb();
  const items = await db.select().from(withdrawals).where(eq(withdrawals.ownerId, seller.userId)).orderBy(desc(withdrawals.id)).limit(20);
  const accounts = await db.select({ id: payoutAccounts.id, bankName: payoutAccounts.bankName, accountType: payoutAccounts.accountType, accountHolderName: payoutAccounts.accountHolderName, accountNumberLast4: payoutAccounts.accountNumberLast4, status: payoutAccounts.status }).from(payoutAccounts).where(and(eq(payoutAccounts.ownerId, seller.userId), eq(payoutAccounts.status, "approved"))).orderBy(desc(payoutAccounts.id));
  return Response.json({ withdrawals: items, payoutAccounts: accounts });
}

export async function POST(request: Request) {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para solicitar un retiro." }, { status: 401 });
  const body = await request.json() as { amountCents?: number; method?: string; destination?: string; payoutAccountId?: number };
  const amountCents = Number(body.amountCents);
  if (!Number.isInteger(amountCents) || amountCents < 100 || !body.method) return Response.json({ error: "Monto mínimo de $1.00 y método son obligatorios." }, { status: 400 });
  const db = getDb();
  const payoutAccountId = body.payoutAccountId == null || body.payoutAccountId === 0 ? null : Number(body.payoutAccountId);
  let destination = body.destination?.trim() ?? "";
  let payoutAccount: { id: number; bankName: string; accountNumberLast4: string } | null = null;
  if (payoutAccountId) {
    if (!Number.isInteger(payoutAccountId)) return Response.json({ error: "Cuenta bancaria inválida." }, { status: 400 });
    const [approved] = await db.select({ id: payoutAccounts.id, bankName: payoutAccounts.bankName, accountNumberLast4: payoutAccounts.accountNumberLast4 }).from(payoutAccounts).where(and(eq(payoutAccounts.id, payoutAccountId), eq(payoutAccounts.ownerId, seller.userId), eq(payoutAccounts.status, "approved"))).limit(1);
    if (!approved) return Response.json({ error: "Selecciona una cuenta bancaria aprobada." }, { status: 409 });
    payoutAccount = approved;
    destination = `Cuenta aprobada · ${approved.bankName} · ****${approved.accountNumberLast4}`;
  }
  if (!destination) return Response.json({ error: "Selecciona una cuenta aprobada o indica un destino de compatibilidad." }, { status: 400 });
  const [updated] = await db.update(sellerBalances).set({ availableCents: sql`${sellerBalances.availableCents} - ${amountCents}`, updatedAt: new Date().toISOString() }).where(and(eq(sellerBalances.ownerId, seller.userId), gte(sellerBalances.availableCents, amountCents))).returning();
  if (!updated) return Response.json({ error: "Saldo insuficiente o balance no disponible." }, { status: 409 });
  const [item] = await db.insert(withdrawals).values({ ownerId: seller.userId, payoutAccountId, amountCents, method: body.method.trim().slice(0, 40), destination: destination.slice(0, 180) }).returning();
  await db.insert(balanceTransactions).values({ ownerId: seller.userId, type: "withdrawal_requested", amountCents: -amountCents, feeCents: 0 });
  await sendSupportEmail(`StreamLock · Nuevo retiro #${item.id}`, `<p>Se solicitó un retiro de <strong>$${(amountCents / 100).toFixed(2)}</strong>.</p><p>Solicitud #${item.id} pendiente de revisión administrativa.</p>`, `withdrawal-request/${item.id}`);
  return Response.json({ withdrawal: item, message: "Solicitud enviada para revisión administrativa." }, { status: 201 });
}
