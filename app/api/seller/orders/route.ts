import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../app/chatgpt-auth";
import { getDb } from "../../../../db";
import { deliveries, orders, products, stores } from "../../../../db/schema";

export async function GET() {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para ver tus pedidos." }, { status: 401 });
  const rows = await getDb().select({ order: orders, product: products, delivery: deliveries })
    .from(orders).innerJoin(stores, eq(orders.storeId, stores.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .leftJoin(deliveries, eq(orders.id, deliveries.orderId))
    .where(and(eq(stores.ownerId, seller.userId)))
    .orderBy(desc(orders.id));
  return Response.json({ orders: rows.map((row) => ({ ...row.order, product: row.product, delivery: row.delivery })) });
}
