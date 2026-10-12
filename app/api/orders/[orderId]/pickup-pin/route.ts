import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { deliveries, orders } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../../app/chatgpt-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para ver el PIN." }, { status: 401 });
  const orderId = Number((await params).orderId);
  const [row] = await getDb().select({ order: orders, delivery: deliveries }).from(orders)
    .innerJoin(deliveries, eq(deliveries.orderId, orders.id))
    .where(and(eq(orders.id, orderId), eq(orders.buyerId, buyer.userId), eq(deliveries.method, "pickup"))).limit(1);
  if (!row) return Response.json({ error: "Entrega presencial no encontrada." }, { status: 404 });
  if (row.delivery.pickupPinExpiresAt && Date.parse(row.delivery.pickupPinExpiresAt) < Date.now()) return Response.json({ error: "El PIN ha expirado. Solicita una nueva entrega." }, { status: 410 });
  return Response.json({ orderId, orderStatus: row.order.status, pickupPin: row.delivery.pickupPin, expiresAt: row.delivery.pickupPinExpiresAt });
}
