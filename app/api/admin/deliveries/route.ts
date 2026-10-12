import { env } from "cloudflare:workers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { deliveries, orders, products, stores } from "../../../../db/schema";
import { createNotification } from "../../../../db/notifications";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function requireAdmin() {
  const user = await getChatGPTUser();
  const email = process.env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || user.email.toLowerCase() !== email) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const rows = await getDb().select({ delivery: deliveries, order: orders, product: products, store: stores })
    .from(deliveries).innerJoin(orders, eq(deliveries.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id)).innerJoin(stores, eq(orders.storeId, stores.id))
    .where(and(eq(deliveries.method, "courier"), inArray(orders.status, ["shipped"])))
    .orderBy(desc(deliveries.id));
  return Response.json({ deliveries: rows });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { orderId?: number };
  const orderId = Number(body.orderId);
  if (!Number.isInteger(orderId)) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ delivery: deliveries, order: orders, store: stores }).from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id)).innerJoin(stores, eq(orders.storeId, stores.id))
    .where(and(eq(orders.id, orderId), eq(deliveries.method, "courier"), eq(orders.status, "shipped"))).limit(1);
  if (!row) return Response.json({ error: "Despacho no encontrado o no está listo para confirmarse." }, { status: 404 });
  const deliveredAt = new Date().toISOString();
  await db.update(deliveries).set({ status: "delivered", deliveredAt }).where(eq(deliveries.orderId, orderId));
  await createNotification(db, { userId: row.order.buyerId, type: "delivery_confirmed", title: "Courier confirmó la entrega", message: `El pedido #${orderId} fue marcado como entregado. Puedes abrir una disputa dentro de las próximas 24 horas.`, orderId });
  await createNotification(db, { userId: row.store.ownerId, type: "delivery_confirmed", title: "Entrega registrada", message: `El pedido #${orderId} entrará en liberación automática después de 24 horas si no hay disputa.`, orderId });
  return Response.json({ ok: true, orderId, deliveredAt });
}
