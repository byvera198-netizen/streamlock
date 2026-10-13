import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { deliveries, orders, stores } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../../app/chatgpt-auth";
import { createNotification } from "../../../../../db/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para registrar el despacho." }, { status: 401 });
  const orderId = Number((await params).orderId);
  const body = await request.json() as { method?: string; carrier?: string; trackingCode?: string };
  if (!Number.isInteger(orderId)) return Response.json({ error: "Orden inválida." }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ order: orders, store: stores }).from(orders).innerJoin(stores, eq(orders.storeId, stores.id)).where(and(eq(orders.id, orderId), eq(stores.ownerId, seller.userId))).limit(1);
  if (!row) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (row.order.status !== "payment_held") return Response.json({ error: "La orden debe tener el pago retenido antes de entregar." }, { status: 409 });
  const [existingDelivery] = await db.select({ id: deliveries.id, status: deliveries.status }).from(deliveries).where(eq(deliveries.orderId, orderId)).limit(1);
  if (existingDelivery) return Response.json({ error: "Esta orden ya tiene un despacho registrado.", deliveryStatus: existingDelivery.status }, { status: 409 });
  const isPickup = row.order.deliveryMethod === "pickup" || body.method === "pickup";
  if (isPickup) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const pickupPin = String((random[0] % 900000) + 100000);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const [delivery] = await db.insert(deliveries).values({ orderId, method: "pickup", status: "ready", pickupPin, pickupPinExpiresAt: expires }).returning();
    await db.update(orders).set({ status: "ready_for_pickup" }).where(eq(orders.id, orderId));
    await createNotification(db, { userId: row.order.buyerId, type: "pickup_ready", title: "Entrega presencial preparada", message: `Tu pedido #${orderId} está listo. Consulta tu PIN en Mis compras.`, orderId });
    await createNotification(db, { userId: seller.userId, type: "pickup_ready", title: "PIN de entrega generado", message: `El pedido #${orderId} está listo para entrega presencial.`, orderId });
    return Response.json({ delivery: { ...delivery, pickupPin: undefined }, orderStatus: "ready_for_pickup", message: "Entrega presencial preparada. El PIN se muestra únicamente al comprador." }, { status: 201 });
  }
  if (!body.carrier?.trim() || !body.trackingCode?.trim()) return Response.json({ error: "Empresa de courier y guía son obligatorias." }, { status: 400 });
  const [delivery] = await db.insert(deliveries).values({ orderId, method: "courier", carrier: body.carrier.trim().slice(0, 100), trackingCode: body.trackingCode.trim().slice(0, 120), status: "in_transit" }).returning();
  await db.update(orders).set({ status: "shipped" }).where(eq(orders.id, orderId));
  await createNotification(db, { userId: row.order.buyerId, type: "order_shipped", title: "Pedido despachado", message: `Tu pedido #${orderId} fue entregado al courier ${body.carrier.trim()} con guía ${body.trackingCode.trim()}.`, orderId });
  await createNotification(db, { userId: seller.userId, type: "order_shipped", title: "Despacho registrado", message: `El pedido #${orderId} quedó marcado como enviado.`, orderId });
  return Response.json({ delivery, orderStatus: "shipped" }, { status: 201 });
}
