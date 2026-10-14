import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products, stores } from "../../../../db/schema";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!/^SL-[A-Z0-9]{6,10}$/.test(code)) return Response.json({ error: "Escribe un código válido, por ejemplo SL-A7K9P2." }, { status: 400 });
  const [row] = await getDb().select({ product: products, store: stores }).from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(eq(products.publicCode, code)).limit(1);
  if (!row) return Response.json({ error: "No encontramos un producto con ese código." }, { status: 404 });
  if (row.product.status !== "published") return Response.json({ error: "Este producto todavía no está publicado por el vendedor." }, { status: 404 });
  if (row.store.status !== "verified") return Response.json({ error: "La vitrina del vendedor todavía está en revisión." }, { status: 409 });
  if (row.product.stock < 1) return Response.json({ error: "Este producto está agotado. El vendedor debe actualizar el stock antes de recibir nuevos pedidos." }, { status: 409 });
  if (row.product.saleMode === "live" && row.product.expiresAt && Date.parse(row.product.expiresAt) <= Date.now()) return Response.json({ error: "Esta publicación Live ya finalizó." }, { status: 410 });
  return Response.json({ product: row.product, store: row.store, checkoutUrl: `/checkout/${row.product.id}` });
}
