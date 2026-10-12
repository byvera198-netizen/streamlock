import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { createNotification } from "../../../../../db/notifications";
import { bankTransferSubmissions, escrowLedger, orders, products } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para cancelar tu orden." }, { status: 401 });
  const orderId = Number((await context.params).orderId);
  if (!Number.isInteger(orderId)) return Response.json({ error: "Orden inválida." }, { status: 400 });
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.buyerId, buyer.userId))).limit(1);
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (order.status !== "payment_pending") return Response.json({ error: "Solo puedes cancelar órdenes pendientes de pago." }, { status: 409 });
  const [submission] = await db.select({ id: bankTransferSubmissions.id }).from(bankTransferSubmissions).where(eq(bankTransferSubmissions.orderId, orderId)).limit(1);
  if (submission) return Response.json({ error: "La orden ya tiene un comprobante y debe ser revisada por administración." }, { status: 409 });
  const [cancelled] = await db.update(orders).set({ status: "payment_failed" }).where(and(eq(orders.id, orderId), eq(orders.status, "payment_pending"))).returning({ id: orders.id });
  if (!cancelled) return Response.json({ error: "La orden cambió de estado. Actualiza la página." }, { status: 409 });
  await db.update(escrowLedger).set({ status: "payment_failed" }).where(and(eq(escrowLedger.orderId, orderId), eq(escrowLedger.status, "awaiting_payment")));
  await db.update(products).set({ stock: sql`${products.stock} + ${order.quantity}` }).where(eq(products.id, order.productId));
  await createNotification(db, { userId: buyer.userId, type: "order_cancelled", title: "Orden cancelada", message: `La orden #${orderId} fue cancelada y el stock quedó liberado.`, orderId });
  return Response.json({ ok: true, orderId, status: "payment_failed" });
}
