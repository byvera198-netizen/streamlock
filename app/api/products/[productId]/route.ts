import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orders, products, stores, userProfiles } from "../../../../db/schema";
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
  const [profile] = await getDb().select({ status: userProfiles.status }).from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  if (!profile || profile.status !== "approved") return Response.json({ error: "Aprueba tu perfil KYC antes de editar productos.", code: "PROFILE_NOT_APPROVED" }, { status: 409 });
  const body = await request.json() as { title?: string; description?: string; category?: string; brand?: string; model?: string; storage?: string | null; color?: string | null; condition?: string; warrantyMonths?: number; price?: number; stock?: number; saleMode?: "store" | "live"; expiresAt?: string | null };
  const title = body.title === undefined ? current.product.title : body.title.trim();
  const description = body.description === undefined ? current.product.description : body.description.trim();
  const category = body.category === undefined ? current.product.category : body.category.trim();
  const brand = body.brand === undefined ? current.product.brand : body.brand.trim();
  const model = body.model === undefined ? current.product.model : body.model.trim();
  const storage = body.storage === undefined ? current.product.storage : body.storage?.trim() || null;
  const color = body.color === undefined ? current.product.color : body.color?.trim() || null;
  const condition = body.condition === undefined ? current.product.condition : body.condition;
  const warrantyMonths = body.warrantyMonths === undefined ? current.product.warrantyMonths : Number(body.warrantyMonths);
  const price = body.price === undefined ? current.product.priceCents / 100 : Number(body.price);
  const stock = body.stock === undefined ? current.product.stock : Number(body.stock);
  if (title.length < 2 || description.length > 2000 || category.length > 40 || brand.length > 60 || model.length > 80 || (storage?.length ?? 0) > 30 || (color?.length ?? 0) > 40 || !["new", "used", "refurbished"].includes(condition) || !Number.isSafeInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 120 || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(Math.round(price * 100)) || !Number.isSafeInteger(stock) || stock < 0) return Response.json({ error: "Los datos del producto deben ser válidos." }, { status: 400 });
  if (body.saleMode !== undefined && body.saleMode !== "store" && body.saleMode !== "live") return Response.json({ error: "El modo de venta no es válido." }, { status: 400 });
  const saleMode = body.saleMode ?? current.product.saleMode;
  let expiresAt: string | null = null;
  if (saleMode === "live") {
    const requestedExpiry = body.expiresAt === undefined ? current.product.expiresAt : body.expiresAt;
    const expiryTimestamp = requestedExpiry ? Date.parse(requestedExpiry) : Date.now() + 24 * 60 * 60 * 1000;
    if (!Number.isFinite(expiryTimestamp) || expiryTimestamp <= Date.now()) return Response.json({ error: "La publicación Live debe tener una fecha futura válida." }, { status: 400 });
    expiresAt = new Date(expiryTimestamp).toISOString();
  }
  const [updated] = await getDb().update(products).set({ title, description, category, brand, model, storage, color, condition, warrantyMonths, priceCents: Math.round(price * 100), stock, saleMode, expiresAt }).where(eq(products.id, productId)).returning();
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
