import { and, eq, or, isNull, gt } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { products, stores } from "../../../db/schema";
import Link from "next/link";
import { supportContact } from "../../site-config";
import CatalogClient from "./catalog-client";
import ShareStoreButton from "./share-store-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [store] = await getDb().select().from(stores).where(eq(stores.slug, slug)).limit(1);
  if (!store) return { title: "Vitrina no encontrada · StreamLock" };
  const availableProducts = await getDb().select({ title: products.title, priceCents: products.priceCents }).from(products)
    .where(and(eq(products.storeId, store.id), eq(products.status, "published"), gt(products.stock, 0), or(eq(products.saleMode, "store"), and(eq(products.saleMode, "live"), or(isNull(products.expiresAt), gt(products.expiresAt, new Date().toISOString()))))))
    .orderBy(products.id);
  const verified = store.status === "verified";
  const productSummary = availableProducts.length === 0
    ? "Catálogo en preparación."
    : `${availableProducts.length} ${availableProducts.length === 1 ? "producto disponible" : "productos disponibles"}${availableProducts[0] ? ` · Desde $${(availableProducts[0].priceCents / 100).toFixed(2)}` : ""}.`;
  const description = verified
    ? `${store.name}: compra con fondos protegidos por StreamLock hasta confirmar la entrega. ${productSummary}`
    : `${store.name}: vitrina en revisión dentro de StreamLock. ${productSummary}`;
  return {
    title: `${store.name} · StreamLock`,
    description,
    alternates: { canonical: `/s/${store.slug}` },
    openGraph: { title: `${store.name} · StreamLock`, description, type: "website", siteName: "StreamLock" },
    twitter: { card: "summary", title: `${store.name} · StreamLock`, description },
  };
}

export default async function Storefront({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [store] = await getDb().select().from(stores).where(eq(stores.slug, slug)).limit(1);
  if (!store) notFound();
  const catalog = await getDb().select().from(products)
    .where(and(eq(products.storeId, store.id), eq(products.status, "published"), gt(products.stock, 0), or(eq(products.saleMode, "store"), and(eq(products.saleMode, "live"), or(isNull(products.expiresAt), gt(products.expiresAt, new Date().toISOString()))))))
    .orderBy(products.id);
  const isVerified = store.status === "verified";

  return <main className="storefront-shell">
    <header className="storefront-header"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><span className="secure-label">Compra protegida por StreamLock</span></header>
    <section className="storefront-hero"><div className="storefront-avatar">{store.name.slice(0, 2).toUpperCase()}</div><p className="kicker">{isVerified ? "VITRINA VERIFICADA" : "VITRINA EN REVISIÓN"}</p><h1>{store.name} {isVerified && <span className="verified-badge">✓</span>}</h1><p>{store.socialNetwork} · {isVerified ? "Compra con fondos protegidos hasta confirmar la entrega." : "Este negocio está completando su revisión de identidad."}</p><ShareStoreButton /></section>
    <section className="storefront-catalog"><div className="storefront-heading"><div><p className="kicker">CATÁLOGO</p><h2>Productos disponibles</h2></div><span>{catalog.length} {catalog.length === 1 ? "producto" : "productos"}</span></div>
      {catalog.length === 0 ? <div className="empty-catalog"><b>Esta vitrina está preparando su catálogo.</b><p>Vuelve pronto para descubrir sus productos.</p></div> : <CatalogClient products={catalog} />}
    </section>
    <footer className="storefront-footer"><span>StreamLock</span><span>El pago se libera al confirmar la entrega.</span><span>Soporte: <a href={`mailto:${supportContact.email}`}>{supportContact.email}</a> · <a href={supportContact.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp {supportContact.whatsappDisplay}</a></span></footer>
  </main>;
}
