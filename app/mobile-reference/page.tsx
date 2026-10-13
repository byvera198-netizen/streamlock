import Link from "next/link";

export const dynamic = "force-static";

const references = [
  { brand: "Samsung", model: "Galaxy A27 5G 8GB 256GB", price: "US$ 424.99", availability: "Listado oficial", source: "Samsung Ecuador", url: "https://shop.samsung.com/latin/ecu/ec/shop/smartphones.html" },
  { brand: "Samsung", model: "Galaxy A37 5G 8GB 256GB", price: "US$ 509.99", availability: "Listado oficial", source: "Samsung Ecuador", url: "https://shop.samsung.com/latin/ecu/ec/shop/smartphones.html" },
  { brand: "Samsung", model: "Galaxy A57 5G 12GB 256GB", price: "US$ 609.99", availability: "Listado oficial", source: "Samsung Ecuador", url: "https://shop.samsung.com/latin/ecu/ec/shop/smartphones.html" },
  { brand: "Samsung", model: "Galaxy S26 FE 5G 8GB 256GB", price: "US$ 949.00", availability: "Listado oficial", source: "Samsung Ecuador", url: "https://shop.samsung.com/latin/ecu/ec/shop/smartphones.html" },
  { brand: "Samsung", model: "Galaxy Z Flip8 256GB", price: "US$ 1,600.00", availability: "Listado oficial", source: "Samsung Ecuador", url: "https://shop.samsung.com/latin/ecu/ec/shop/smartphones.html" },
  { brand: "Apple", model: "iPhone 17e", price: "Desde US$ 1,099.00", availability: "Revisar stock por variante", source: "iShop Ecuador", url: "https://ec.tiendasishop.com/collections/todos-los-iphone" },
  { brand: "Apple", model: "iPhone 17", price: "Desde US$ 1,419.00", availability: "Revisar stock por variante", source: "iShop Ecuador", url: "https://ec.tiendasishop.com/collections/todos-los-iphone" },
  { brand: "Apple", model: "iPhone 17 Pro", price: "Desde US$ 1,609.00", availability: "Revisar stock por variante", source: "iShop Ecuador", url: "https://ec.tiendasishop.com/collections/todos-los-iphone" },
  { brand: "Apple", model: "iPhone 17 Pro Max", price: "Desde US$ 1,779.00", availability: "Revisar stock por variante", source: "iShop Ecuador", url: "https://ec.tiendasishop.com/collections/todos-los-iphone" },
  { brand: "Xiaomi", model: "Xiaomi 15T", price: "Consultar", availability: "Modelo identificado; precio no mostrado en el listado", source: "Xiaomi Latam", url: "https://www.mi.com/latin-es/product-list/phone/" },
  { brand: "Xiaomi", model: "REDMI Note 14", price: "Consultar", availability: "Modelo identificado; precio no mostrado en el listado", source: "Xiaomi Latam", url: "https://www.mi.com/latin-es/product-list/phone/" },
  { brand: "POCO", model: "POCO F7", price: "Consultar", availability: "Modelo identificado; precio no mostrado en el listado", source: "Xiaomi Latam", url: "https://www.mi.com/latin-es/product-list/phone/poco/" },
];

export default function MobileReferencePage() {
  return <main className="reference-shell">
    <header className="storefront-header"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><Link href="/" prefetch={false} className="secure-label">Volver al panel</Link></header>
    <section className="reference-hero"><p className="kicker">REFERENCIAS DE MERCADO</p><h1>Modelos para tu catálogo móvil.</h1><p>Precios orientativos consultados el 12 de octubre de 2026 en tiendas oficiales de Ecuador y Latinoamérica.</p><div className="reference-warning"><b>No es inventario de StreamLock.</b><span>Verifica existencia, variante, garantía y precio final antes de publicar una oferta.</span></div></section>
    <section className="reference-grid">{references.map((item) => <article className="reference-card" key={`${item.brand}-${item.model}`}><div className="reference-card-top"><span>{item.brand}</span><small>{item.availability}</small></div><h2>{item.model}</h2><strong>{item.price}</strong><p>Usa esta ficha como punto de partida y completa color, condición, garantía y stock real del vendedor.</p><a href={item.url} target="_blank" rel="noreferrer">Ver fuente: {item.source} ↗</a></article>)}</section>
    <footer className="storefront-footer"><span>StreamLock</span><span>Precios sujetos a cambio y disponibilidad.</span><Link href="/" prefetch={false}>Publicar desde el panel →</Link></footer>
  </main>;
}
