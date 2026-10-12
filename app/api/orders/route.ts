import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { deliveries, escrowLedger, orders, products, stores, userProfiles } from "../../../db/schema";

const SERVICE_FEE_RATE = 0.07;

export async function POST(request: Request) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para continuar con tu compra." }, { status: 401 });
  const body = await request.json() as { productId?: number; quantity?: number; deliveryMethod?: string };
  const productId = Number(body.productId);
  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return Response.json({ error: "Producto o cantidad inválidos." }, { status: 400 });
  }

  const [item] = await getDb().select({ product: products, store: stores }).from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(and(eq(products.id, productId), eq(products.status, "published"))).limit(1);
  if (!item) return Response.json({ error: "El producto no está disponible." }, { status: 404 });
  if (item.product.stock < quantity) return Response.json({ error: "No hay suficiente stock disponible." }, { status: 409 });

  const subtotalCents = item.product.priceCents * quantity;
  const feeCents = Math.round(subtotalCents * SERVICE_FEE_RATE);
  const totalCents = subtotalCents + feeCents;
  const deliveryMethod = body.deliveryMethod === "pickup" ? "pickup" : "courier";
  const db = getDb();
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, buyer.userId)).limit(1);
  if (!profile) return Response.json({ error: "Completa tu perfil de identidad y despacho antes de comprar.", code: "PROFILE_REQUIRED" }, { status: 409 });
  const [order] = await db.insert(orders).values({ buyerId: buyer.userId, storeId: item.store.id, productId, quantity, unitPriceCents: item.product.priceCents, subtotalCents, feeCents, totalCents, deliveryMethod, shippingName: profile.legalName, shippingPhone: profile.phone, shippingAddress: profile.address, status: "payment_pending" }).returning();
  const [escrow] = await db.insert(escrowLedger).values({ orderId: order.id, amountCents: subtotalCents, feeCents, status: "awaiting_payment" }).returning();
  return Response.json({ order, escrow, next: "payment_provider_required" }, { status: 201 });
}

export async function GET() {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para ver tus órdenes." }, { status: 401 });
  const rows = await getDb().select({ order: orders, product: products, store: stores, delivery: deliveries })
    .from(orders).innerJoin(products, eq(orders.productId, products.id)).innerJoin(stores, eq(orders.storeId, stores.id))
    .leftJoin(deliveries, eq(orders.id, deliveries.orderId)).where(eq(orders.buyerId, buyer.userId));
  return Response.json({ orders: rows.map((row) => ({ ...row.order, product: row.product, store: row.store, delivery: row.delivery })) });
}
