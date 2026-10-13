"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type CatalogProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  storage: string | null;
  color: string | null;
  condition: string;
  warrantyMonths: number;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
};

function imageSrc(value: string | null) {
  return value?.startsWith("r2://") ? `/api/products/media?key=${encodeURIComponent(value.slice(5))}` : value;
}

function conditionLabel(value: string) {
  return value === "used" ? "Usado" : value === "refurbished" ? "Reacondicionado" : "Nuevo";
}

function categoryLabel(value: string) {
  return value === "mobile" ? "Celular" : value === "accessory" ? "Accesorio" : "Producto";
}

export default function CatalogClient({ products }: { products: CatalogProduct[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [condition, setCondition] = useState("all");
  const brands = useMemo(() => [...new Set(products.map((product) => product.brand).filter(Boolean))].sort(), [products]);
  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const text = [product.title, product.brand, product.model, product.storage, product.color].filter(Boolean).join(" ").toLowerCase();
      return (!needle || text.includes(needle)) && (brand === "all" || product.brand === brand) && (category === "all" || product.category === category) && (condition === "all" || product.condition === condition);
    });
  }, [brand, category, condition, products, query]);

  return <>
    <div className="catalog-tools" aria-label="Filtros del catálogo">
      <label className="catalog-search">Buscar producto<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="iPhone 17, Samsung, 256 GB…" /></label>
      <label>Tipo<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todos los tipos</option>{categories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>
      <label>Marca<select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">Todas las marcas</option>{brands.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Condición<select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="all">Todas</option><option value="new">Nuevo</option><option value="used">Usado</option><option value="refurbished">Reacondicionado</option></select></label>
    </div>
    {visibleProducts.length === 0 ? <div className="empty-catalog"><b>No encontramos productos con esos filtros.</b><p>Prueba otra marca, modelo, categoría o condición.</p></div> : <div className="storefront-products">{visibleProducts.map((product) => <article className="storefront-product" key={product.id}><div className="product-image">{product.imageUrl ? <img src={imageSrc(product.imageUrl) ?? undefined} alt={product.title} /> : <span>{product.title.slice(0, 1).toUpperCase()}</span>}</div><div className="product-info"><h3>{product.title}</h3>{product.description && <p className="product-description">{product.description}</p>}<div className="product-specs">{[categoryLabel(product.category), product.brand && product.model ? `${product.brand} ${product.model}` : product.brand || product.model, product.storage, product.color, conditionLabel(product.condition), product.warrantyMonths ? `${product.warrantyMonths} meses de garantía` : null].filter(Boolean).map((spec) => <span key={spec}>{spec}</span>)}</div><p>{product.stock} disponibles</p><strong>${(product.priceCents / 100).toFixed(2)}</strong><Link prefetch={false} className="storefront-buy" href={`/checkout/${product.id}`}>Comprar protegido</Link></div></article>)}</div>}
  </>;
}
