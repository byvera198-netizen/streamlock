import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { deliveries, disputes, escrowLedger, orders, stores } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../../app/chatgpt-auth";
import { createNotification } from "../../../../../db/notifications";
import { creditSellerBalance } from "../../../../../db/balances";

export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para confirmar la recepción." }, { status: 401 });
  const orderId = Number((await params).orderId);
  if (!Number.isInteger(orderId)) return Response.json({ error: "Orden inválida." }, { status: 400 });
  const db = getDb();
  const [order] = await db.select({ order: orders, store: stores }).from(orders).innerJoin(stores, eq(orders.storeId, stores.id)).where(and(eq(orders.id, orderId), eq(orders.buyerId, buyer.userId))).limit(1);
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  const [activeDispute] = await db.select().from(disputes).where(and(eq(disputes.orderId, orderId), eq(disputes.status, "open"))).limit(1);
  if (activeDispute) return Response.json({ error: "Esta orden está en disputa y no puede cerrarse hasta la revisión." }, { status: 409 });
  if (order.order.status === "completed") return Response.json({ ok: true, duplicate: true, orderStatus: "completed" });
  if (order.order.status !== "shipped") return Response.json({ error: "La orden todavía no está marcada como despachada." }, { status: 409 });
  const releasedAt = new Date().toISOString();
  const [completed] = await db.update(orders).set({ status: "completed" }).where(and(eq(orders.id, orderId), eq(orders.status, "shipped"))).returning({ id: orders.id });
  if (!completed) return Response.json({ error: "La orden ya fue procesada por otra solicitud." }, { status: 409 });
  await db.update(deliveries).set({ status: "delivered", deliveredAt: releasedAt, receivedAt: releasedAt }).where(eq(deliveries.orderId, orderId));
  await db.update(escrowLedger).set({ status: "released", releasedAt }).where(eq(escrowLedger.orderId, orderId));
  await creditSellerBalance(db, order.store.ownerId, orderId, order.order.subtotalCents, order.order.feeCents);
  await createNotification(db, { userId: buyer.userId, type: "order_completed", title: "Entrega confirmada", message: `Confirmaste la recepción del pedido #${orderId}.`, orderId });
  await createNotification(db, { userId: order.store.ownerId, type: "funds_released", title: "Fondos liberados", message: `Los fondos del pedido #${orderId} fueron liberados a tu balance.`, orderId });
  return Response.json({ ok: true, orderId, orderStatus: "completed", releasedAt });
}
