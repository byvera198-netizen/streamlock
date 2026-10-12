import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { balanceTransactions, sellerBalances, withdrawals } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { sendSupportEmail } from "../../../email";

export async function GET() {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para consultar tus retiros." }, { status: 401 });
  const items = await getDb().select().from(withdrawals).where(eq(withdrawals.ownerId, seller.userId)).orderBy(desc(withdrawals.id)).limit(20);
  return Response.json({ withdrawals: items });
}

export async function POST(request: Request) {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para solicitar un retiro." }, { status: 401 });
  const body = await request.json() as { amountCents?: number; method?: string; destination?: string };
  const amountCents = Number(body.amountCents);
  if (!Number.isInteger(amountCents) || amountCents < 100 || !body.method || !body.destination?.trim()) return Response.json({ error: "Monto mínimo de $1.00, método y destino son obligatorios." }, { status: 400 });
  const db = getDb();
  const [updated] = await db.update(sellerBalances).set({ availableCents: sql`${sellerBalances.availableCents} - ${amountCents}`, updatedAt: new Date().toISOString() }).where(and(eq(sellerBalances.ownerId, seller.userId), gte(sellerBalances.availableCents, amountCents))).returning();
  if (!updated) return Response.json({ error: "Saldo insuficiente o balance no disponible." }, { status: 409 });
  const [item] = await db.insert(withdrawals).values({ ownerId: seller.userId, amountCents, method: body.method.trim().slice(0, 40), destination: body.destination.trim().slice(0, 180) }).returning();
  await db.insert(balanceTransactions).values({ ownerId: seller.userId, type: "withdrawal_requested", amountCents: -amountCents, feeCents: 0 });
  await sendSupportEmail(`StreamLock · Nuevo retiro #${item.id}`, `<p>Se solicitó un retiro de <strong>$${(amountCents / 100).toFixed(2)}</strong>.</p><p>Solicitud #${item.id} pendiente de revisión administrativa.</p>`, `withdrawal-request/${item.id}`);
  return Response.json({ withdrawal: item, message: "Solicitud enviada para revisión administrativa." }, { status: 201 });
}
