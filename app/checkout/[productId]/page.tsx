import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { products, stores } from "../../../db/schema";
import CheckoutClient from "./checkout-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> {
  const { productId } = await params;
  const id = Number(productId);
  if (!Number.isInteger(id)) return { title: "Checkout no disponible · StreamLock" };
  const [row] = await getDb().select({ product: products, store: stores }).from(products)
    .innerJoin(stores, eq(products.storeId, stores.id)).where(eq(products.id, id)).limit(1);
  if (!row || row.product.status !== "published" || row.product.stock < 1) return { title: "Producto no disponible · StreamLock" };
  const price = `$${(row.product.priceCents / 100).toFixed(2)} USD`;
  const description = `${row.product.title} por ${row.store.name}: paga por transferencia y mantén tus fondos protegidos hasta confirmar la entrega. Precio ${price}.`;
  const externalImage = row.product.imageUrl && /^https?:\/\//i.test(row.product.imageUrl) ? row.product.imageUrl : undefined;
  return {
    title: `${row.product.title} · Compra protegida · StreamLock`,
    description,
    alternates: { canonical: `/checkout/${row.product.id}` },
    openGraph: {
      title: `${row.product.title} · StreamLock`,
      description,
      type: "website",
      siteName: "StreamLock",
      ...(externalImage ? { images: [{ url: externalImage, alt: row.product.title }] } : {}),
    },
    twitter: { card: externalImage ? "summary_large_image" : "summary", title: `${row.product.title} · StreamLock`, description },
  };
}

export default async function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const id = Number(productId);
  if (!Number.isInteger(id)) notFound();
  const [row] = await getDb().select({ product: products, store: stores }).from(products)
    .innerJoin(stores, eq(products.storeId, stores.id)).where(eq(products.id, id)).limit(1);
  if (!row || row.product.status !== "published" || row.product.stock < 1) notFound();
  return <CheckoutClient product={row.product} store={row.store} />;
}
