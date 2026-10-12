import { and, eq, or, isNull, gt } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { products, stores } from "../../../db/schema";
import Link from "next/link";
import { supportContact } from "../../site-config";

export const dynamic = "force-dynamic";

function productImageSrc(imageUrl: string | null) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("r2://") ? `/api/products/media?key=${encodeURIComponent(imageUrl.slice(5))}` : imageUrl;
}

export default async function Storefront({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [store] = await getDb().select().from(stores).where(eq(stores.slug, slug)).limit(1);
  if (!store) notFound();
  const catalog = await getDb().select().from(products)
    .where(and(eq(products.storeId, store.id), eq(products.status, "published"), or(eq(products.saleMode, "store"), and(eq(products.saleMode, "live"), or(isNull(products.expiresAt), gt(products.expiresAt, new Date().toISOString()))))))
    .orderBy(products.id);

  return <main className="storefront-shell">
    <header className="storefront-header"><Link href="/" className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><span className="secure-label">Compra protegida por StreamLock</span></header>
    <section className="storefront-hero"><div className="storefront-avatar">{store.name.slice(0, 2).toUpperCase()}</div><p className="kicker">VITRINA VERIFICADA</p><h1>{store.name} <span className="verified-badge">✓</span></h1><p>{store.socialNetwork} · Compra con fondos protegidos hasta confirmar la entrega.</p></section>
    <section className="storefront-catalog"><div className="storefront-heading"><div><p className="kicker">CATÁLOGO</p><h2>Productos disponibles</h2></div><span>{catalog.length} {catalog.length === 1 ? "producto" : "productos"}</span></div>
      {catalog.length === 0 ? <div className="empty-catalog"><b>Esta vitrina está preparando su catálogo.</b><p>Vuelve pronto para descubrir sus productos.</p></div> : <div className="storefront-products">{catalog.map((product) => <article className="storefront-product" key={product.id}><div className="product-image">{product.imageUrl ? <img src={productImageSrc(product.imageUrl) ?? undefined} alt={product.title} /> : <span>{product.title.slice(0, 1).toUpperCase()}</span>}</div><div className="product-info"><h3>{product.title}</h3><p>{product.stock} disponibles</p><strong>${(product.priceCents / 100).toFixed(2)}</strong><Link className="storefront-buy" href={`/checkout/${product.id}`}>Comprar protegido</Link></div></article>)}</div>}
    </section>
    <footer className="storefront-footer"><span>StreamLock</span><span>El pago se libera al confirmar la entrega.</span><span>Soporte: <a href={`mailto:${supportContact.email}`}>{supportContact.email}</a> · <a href={supportContact.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp {supportContact.whatsappDisplay}</a></span></footer>
  </main>;
}
