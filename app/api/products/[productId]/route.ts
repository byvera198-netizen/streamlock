import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orders, products, stores } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function getOwnedProduct(productId: number, userId: string) {
  const [row] = await getDb().select({ product: products, store: stores }).from(products).innerJoin(stores, eq(products.storeId, stores.id)).where(and(eq(products.id, productId), eq(stores.ownerId, userId))).limit(1);
  return row;
}

export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para editar productos." }, { status: 401 });
  const productId = Number((await context.params).productId);
  if (!Number.isInteger(productId)) return Response.json({ error: "Producto inválido." }, { status: 400 });
  const current = await getOwnedProduct(productId, user.userId);
  if (!current) return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  if (current.product.status !== "published") return Response.json({ error: "Este producto ya no está activo." }, { status: 409 });
  const body = await request.json() as { title?: string; description?: string; price?: number; stock?: number; expiresAt?: string | null };
  const title = body.title === undefined ? current.product.title : body.title.trim();
  const description = body.description === undefined ? current.product.description : body.description.trim();
  const price = body.price === undefined ? current.product.priceCents / 100 : Number(body.price);
  const stock = body.stock === undefined ? current.product.stock : Number(body.stock);
  if (title.length < 2 || description.length > 2000 || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) return Response.json({ error: "Título, descripción, precio y stock deben ser válidos." }, { status: 400 });
  const [updated] = await getDb().update(products).set({ title, description, priceCents: Math.round(price * 100), stock, expiresAt: body.expiresAt === undefined ? current.product.expiresAt : body.expiresAt }).where(eq(products.id, productId)).returning();
  return Response.json({ product: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para retirar productos." }, { status: 401 });
  const productId = Number((await context.params).productId);
  if (!Number.isInteger(productId)) return Response.json({ error: "Producto inválido." }, { status: 400 });
  const current = await getOwnedProduct(productId, user.userId);
  if (!current) return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  const activeOrder = await getDb().select({ id: orders.id }).from(orders).where(and(eq(orders.productId, productId), sql`${orders.status} NOT IN ('completed', 'refunded', 'payment_failed')`)).limit(1);
  if (activeOrder.length) return Response.json({ error: "No puedes retirar un producto con órdenes activas." }, { status: 409 });
  const [updated] = await getDb().update(products).set({ status: "archived" }).where(eq(products.id, productId)).returning({ id: products.id, status: products.status });
  return Response.json({ product: updated });
}
