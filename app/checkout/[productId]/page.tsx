import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { products, stores } from "../../../db/schema";
import CheckoutClient from "./checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const id = Number(productId);
  if (!Number.isInteger(id)) notFound();
  const [row] = await getDb().select({ product: products, store: stores }).from(products)
    .innerJoin(stores, eq(products.storeId, stores.id)).where(eq(products.id, id)).limit(1);
  if (!row || row.product.status !== "published" || row.product.stock < 1) notFound();
  return <CheckoutClient product={row.product} store={row.store} />;
}
