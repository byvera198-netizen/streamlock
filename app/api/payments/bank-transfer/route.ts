import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bankTransferSubmissions, orders } from "../../../../db/schema";
import { getChatGPTUser } from "../../../../app/chatgpt-auth";
import { env } from "cloudflare:workers";

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
  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const form = isMultipart ? await request.formData() : null;
  const body = isMultipart ? { orderId: form?.get("orderId"), bank: form?.get("bank"), reference: form?.get("reference"), receipt: form?.get("receipt"), receiptUrl: form?.get("receiptUrl") } : { ...(await request.json()), receipt: null };
  const orderId = Number(body.orderId);
  const bank = BANK_ACCOUNTS.find((account) => account.id === body.bank);
  if (!Number.isInteger(orderId) || !bank || typeof body.reference !== "string" || !body.reference.trim()) return Response.json({ error: "Banco, orden y número de comprobante son obligatorios." }, { status: 400 });
  const receipt = body.receipt instanceof File ? body.receipt : null;
  if (receipt && (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(receipt.type) || receipt.size > 5 * 1024 * 1024)) return Response.json({ error: "El comprobante debe ser PDF, JPG, PNG o WebP de máximo 5 MB." }, { status: 400 });

  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.buyerId !== buyer.userId) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (order.status !== "payment_pending") return Response.json({ error: "Esta orden ya no acepta comprobantes." }, { status: 409 });

  let receiptUrl: string | null = null;
  if (receipt) {
    const extension = receipt.type === "application/pdf" ? "pdf" : receipt.type.split("/")[1];
    const key = `receipts/${buyer.userId}/${orderId}-${crypto.randomUUID()}.${extension}`;
    await env.RECEIPTS.put(key, receipt.stream(), { httpMetadata: { contentType: receipt.type } });
    receiptUrl = `r2://${key}`;
  }
  if (!receipt && typeof body.receiptUrl === "string") receiptUrl = body.receiptUrl.trim().slice(0, 500) || null;
  const [submission] = await db.insert(bankTransferSubmissions).values({ orderId, bank: bank.id, reference: body.reference.trim().slice(0, 120), amountCents: order.totalCents, receiptUrl }).returning();
  return Response.json({ submission, message: "Comprobante recibido. La orden queda pendiente de revisión administrativa." }, { status: 201 });
}
