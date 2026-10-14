import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bankAccounts, bankTransferSubmissions, orders, stores } from "../../../../db/schema";
import { createNotification } from "../../../../db/notifications";
import { getChatGPTUser } from "../../../../app/chatgpt-auth";
import { env } from "cloudflare:workers";
import { allowRateLimit } from "../../../security-guard";

export async function GET() {
  const accounts = await getDb().select({ id: bankAccounts.slug, bank: bankAccounts.bankName, accountType: bankAccounts.accountType, accountNumber: bankAccounts.accountNumber })
    .from(bankAccounts).where(eq(bankAccounts.active, true)).orderBy(asc(bankAccounts.id));
  return Response.json({ accounts });
}

export async function POST(request: Request) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para registrar tu comprobante." }, { status: 401 });
  if (!(await allowRateLimit(request, "bank-receipt", buyer.userId, 10, 60 * 60 * 1000))) return Response.json({ error: "Demasiados intentos de registro. Intenta nuevamente más tarde." }, { status: 429 });
  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const form = isMultipart ? await request.formData() : null;
  const body = isMultipart ? { orderId: form?.get("orderId"), bank: form?.get("bank"), reference: form?.get("reference"), receipt: form?.get("receipt") } : { ...(await request.json() as Record<string, unknown>), receipt: null };
  const orderId = Number(body.orderId);
  const db = getDb();
  const [bank] = await db.select().from(bankAccounts).where(eq(bankAccounts.slug, String(body.bank ?? ""))).limit(1);
  if (!bank?.active) return Response.json({ error: "Selecciona una cuenta bancaria activa." }, { status: 400 });
  if (!Number.isInteger(orderId) || typeof body.reference !== "string" || !body.reference.trim()) return Response.json({ error: "Banco, orden y número de comprobante son obligatorios." }, { status: 400 });
  const receipt = body.receipt instanceof File ? body.receipt : null;
  if (!receipt) return Response.json({ error: "Adjunta el comprobante del depósito o transferencia para continuar." }, { status: 400 });
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(receipt.type) || receipt.size > 5 * 1024 * 1024) return Response.json({ error: "El comprobante debe ser PDF, JPG, PNG o WebP de máximo 5 MB." }, { status: 400 });

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.buyerId !== buyer.userId) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (order.status !== "payment_pending") return Response.json({ error: "Esta orden ya no acepta comprobantes." }, { status: 409 });
  const [existing] = await db.select({ id: bankTransferSubmissions.id, status: bankTransferSubmissions.status }).from(bankTransferSubmissions).where(eq(bankTransferSubmissions.orderId, orderId)).limit(1);
  if (existing) return Response.json({ error: "Esta orden ya tiene un comprobante registrado.", submissionId: existing.id, status: existing.status }, { status: 409 });

  let receiptUrl: string | null = null;
  if (receipt) {
    const extension = receipt.type === "application/pdf" ? "pdf" : receipt.type.split("/")[1];
    const key = `receipts/${buyer.userId}/${orderId}-${crypto.randomUUID()}.${extension}`;
    await env.RECEIPTS.put(key, receipt.stream(), { httpMetadata: { contentType: receipt.type } });
    receiptUrl = `r2://${key}`;
  }
  const [submission] = await db.insert(bankTransferSubmissions).values({ orderId, bank: bank.slug, reference: body.reference.trim().slice(0, 120), amountCents: order.totalCents, receiptUrl }).returning();
  const [store] = await db.select({ ownerId: stores.ownerId }).from(stores).where(eq(stores.id, order.storeId)).limit(1);
  if (store) {
    try {
      await createNotification(db, { userId: store.ownerId, type: "payment_submitted", title: "Nuevo comprobante recibido", message: `El comprador registró un comprobante para el pedido #${order.id}. El pago está pendiente de revisión administrativa.`, orderId: order.id });
    } catch {
      // La recepción del comprobante no debe fallar si el aviso adicional no está disponible.
    }
  }
  return Response.json({ submission, message: "Comprobante recibido. La orden queda pendiente de revisión administrativa." }, { status: 201 });
}
