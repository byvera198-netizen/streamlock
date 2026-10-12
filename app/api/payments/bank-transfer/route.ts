import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bankTransferSubmissions, orders } from "../../../../db/schema";
import { getChatGPTUser } from "../../../../app/chatgpt-auth";

const BANK_ACCOUNTS = [
  { id: "pichincha", bank: "Banco Pichincha", accountType: "Cuenta de ahorro", accountNumber: "2210107606" },
  { id: "internacional", bank: "Banco Internacional", accountType: "Cuenta de ahorros", accountNumber: "1950703151" },
  { id: "guayaquil", bank: "Banco Guayaquil", accountType: "Cuenta de ahorro", accountNumber: "0061962064" },
] as const;

export async function GET() {
  return Response.json({ accounts: BANK_ACCOUNTS });
}

export async function POST(request: Request) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para registrar tu comprobante." }, { status: 401 });
  const body = await request.json() as { orderId?: number; bank?: string; reference?: string; receiptUrl?: string };
  const orderId = Number(body.orderId);
  const bank = BANK_ACCOUNTS.find((account) => account.id === body.bank);
  if (!Number.isInteger(orderId) || !bank || !body.reference?.trim()) return Response.json({ error: "Banco, orden y número de comprobante son obligatorios." }, { status: 400 });

  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.buyerId !== buyer.userId) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (order.status !== "payment_pending") return Response.json({ error: "Esta orden ya no acepta comprobantes." }, { status: 409 });

  const [submission] = await db.insert(bankTransferSubmissions).values({ orderId, bank: bank.id, reference: body.reference.trim().slice(0, 120), amountCents: order.totalCents, receiptUrl: body.receiptUrl?.trim().slice(0, 500) || null }).returning();
  return Response.json({ submission, message: "Comprobante recibido. La orden queda pendiente de revisión administrativa." }, { status: 201 });
}
