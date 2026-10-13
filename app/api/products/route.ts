import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { products, stores } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para ver tus productos." }, { status: 401 });
  const rows = await getDb().select({ product: products, store: stores }).from(products)
    .innerJoin(stores, eq(products.storeId, stores.id)).where(eq(stores.ownerId, user.userId))
    .orderBy(desc(products.id));
  return Response.json({ products: rows.map((row) => row.product) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para publicar productos." }, { status: 401 });
  const body = await request.json() as { storeId?: number; title?: string; description?: string; category?: string; brand?: string; model?: string; storage?: string; color?: string; condition?: string; warrantyMonths?: number; price?: number; stock?: number; imageUrl?: string; saleMode?: "store" | "live"; expiresAt?: string };
  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const category = body.category?.trim() || "general";
  const brand = body.brand?.trim() || "";
  const model = body.model?.trim() || "";
  const storage = body.storage?.trim() || null;
  const color = body.color?.trim() || null;
  const condition = body.condition === "used" || body.condition === "refurbished" ? body.condition : "new";
  const warrantyMonths = body.warrantyMonths === undefined ? 0 : Number(body.warrantyMonths);
  const price = Number(body.price);
  const stock = Number(body.stock);
  if (!body.storeId || title.length < 2 || description.length > 2000 || category.length > 40 || brand.length > 60 || model.length > 80 || (storage?.length ?? 0) > 30 || (color?.length ?? 0) > 40 || !Number.isFinite(warrantyMonths) || !Number.isInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 120 || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    return Response.json({ error: "Completa título, precio y stock con valores válidos." }, { status: 400 });
  }
  const owned = await getDb().select({ id: stores.id }).from(stores).where(and(eq(stores.id, body.storeId), eq(stores.ownerId, user.userId))).limit(1);
  if (!owned.length) return Response.json({ error: "El negocio no pertenece a esta cuenta." }, { status: 403 });
  const saleMode = body.saleMode === "live" ? "live" : "store";
  const expiresAt = saleMode === "live" ? (body.expiresAt ? new Date(body.expiresAt).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) : null;
  if (saleMode === "live" && (!expiresAt || Date.parse(expiresAt) <= Date.now())) return Response.json({ error: "La publicación Live debe tener una fecha futura." }, { status: 400 });
  const [product] = await getDb().insert(products).values({ storeId: body.storeId, title, description, category, brand, model, storage, color, condition, warrantyMonths, priceCents: Math.round(price * 100), stock, status: "published", imageUrl: body.imageUrl?.trim() || null, saleMode, expiresAt }).returning();
  return Response.json({ product }, { status: 201 });
}
