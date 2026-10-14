import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products, stores } from "../../../../db/schema";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!/^SL-[A-Z0-9]{6,10}$/.test(code)) return Response.json({ error: "Escribe un código válido, por ejemplo SL-A7K9P2." }, { status: 400 });
  const [row] = await getDb().select({ product: products, store: stores }).from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(and(
      eq(products.publicCode, code),
      eq(products.status, "published"),
      gt(products.stock, 0),
      eq(stores.status, "verified"),
      or(eq(products.saleMode, "store"), and(eq(products.saleMode, "live"), or(isNull(products.expiresAt), gt(products.expiresAt, new Date().toISOString())))),
    )).limit(1);
  if (!row) return Response.json({ error: "No encontramos un producto disponible con ese código." }, { status: 404 });
  return Response.json({ product: row.product, store: row.store, checkoutUrl: `/checkout/${row.product.id}` });
}
