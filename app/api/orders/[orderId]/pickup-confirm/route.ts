import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { deliveries, escrowLedger, orders, stores } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../../app/chatgpt-auth";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para validar la entrega." }, { status: 401 });
  const orderId = Number((await params).orderId);
  const body = await request.json() as { pin?: string };
  if (!Number.isInteger(orderId) || !/^\d{6}$/.test(body.pin ?? "")) return Response.json({ error: "PIN inválido." }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ order: orders, delivery: deliveries }).from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id)).innerJoin(deliveries, eq(deliveries.orderId, orders.id))
    .where(and(eq(orders.id, orderId), eq(stores.ownerId, seller.userId), eq(deliveries.method, "pickup"))).limit(1);
  if (!row) return Response.json({ error: "Orden de entrega presencial no encontrada." }, { status: 404 });
  if (row.order.status === "completed") return Response.json({ ok: true, duplicate: true, orderStatus: "completed" });
  if (row.order.status !== "ready_for_pickup") return Response.json({ error: "La orden no está lista para entrega presencial." }, { status: 409 });
  if (row.delivery.pickupPinExpiresAt && Date.parse(row.delivery.pickupPinExpiresAt) < Date.now()) return Response.json({ error: "El PIN ha expirado." }, { status: 410 });
  if (row.delivery.pickupPin !== body.pin) return Response.json({ error: "PIN incorrecto. Verifica el código mostrado por el comprador." }, { status: 403 });
  const receivedAt = new Date().toISOString();
  await db.update(deliveries).set({ status: "delivered", receivedAt }).where(eq(deliveries.orderId, orderId));
  await db.update(orders).set({ status: "completed" }).where(eq(orders.id, orderId));
  await db.update(escrowLedger).set({ status: "released", releasedAt: receivedAt }).where(eq(escrowLedger.orderId, orderId));
  return Response.json({ ok: true, orderId, orderStatus: "completed", releasedAt: receivedAt });
}
