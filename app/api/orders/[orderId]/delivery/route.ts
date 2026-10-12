import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { deliveries, orders, stores } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../../app/chatgpt-auth";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para registrar el despacho." }, { status: 401 });
  const orderId = Number((await params).orderId);
  const body = await request.json() as { carrier?: string; trackingCode?: string };
  if (!Number.isInteger(orderId) || !body.carrier?.trim() || !body.trackingCode?.trim()) return Response.json({ error: "Empresa de courier y guía son obligatorias." }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ order: orders, store: stores }).from(orders).innerJoin(stores, eq(orders.storeId, stores.id)).where(and(eq(orders.id, orderId), eq(stores.ownerId, seller.userId))).limit(1);
  if (!row) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (row.order.status !== "payment_held") return Response.json({ error: "La orden debe tener el pago retenido antes de despachar." }, { status: 409 });
  const [delivery] = await db.insert(deliveries).values({ orderId, method: "courier", carrier: body.carrier.trim().slice(0, 100), trackingCode: body.trackingCode.trim().slice(0, 120), status: "in_transit" }).returning();
  await db.update(orders).set({ status: "shipped" }).where(eq(orders.id, orderId));
  return Response.json({ delivery, orderStatus: "shipped" }, { status: 201 });
}
