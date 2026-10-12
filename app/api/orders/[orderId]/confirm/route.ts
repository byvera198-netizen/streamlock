import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { deliveries, escrowLedger, orders } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../../app/chatgpt-auth";

export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para confirmar la recepción." }, { status: 401 });
  const orderId = Number((await params).orderId);
  if (!Number.isInteger(orderId)) return Response.json({ error: "Orden inválida." }, { status: 400 });
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.buyerId, buyer.userId))).limit(1);
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (order.status === "completed") return Response.json({ ok: true, duplicate: true, orderStatus: "completed" });
  if (order.status !== "shipped") return Response.json({ error: "La orden todavía no está marcada como despachada." }, { status: 409 });
  const releasedAt = new Date().toISOString();
  await db.update(deliveries).set({ status: "delivered", receivedAt: releasedAt }).where(eq(deliveries.orderId, orderId));
  await db.update(orders).set({ status: "completed" }).where(eq(orders.id, orderId));
  await db.update(escrowLedger).set({ status: "released", releasedAt }).where(eq(escrowLedger.orderId, orderId));
  return Response.json({ ok: true, orderId, orderStatus: "completed", releasedAt });
}
