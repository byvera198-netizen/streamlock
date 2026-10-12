"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import NotificationsPanel from "./components/notifications-panel";

type Store = { id: number; name: string; slug: string; socialNetwork: string; status: string };
type Product = { id: number; title: string; description: string; priceCents: number; stock: number; status: string; saleMode: string; expiresAt: string | null };
type SellerOrder = { id: number; totalCents: number; status: string; deliveryMethod: string; quantity: number; product: Product; delivery: { method: string; carrier: string | null; trackingCode: string | null; status: string; pickupPin: string | null } | null };
type SellerBalance = { availableCents: number; totalEarnedCents: number };

export default function DashboardClient() {
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [network, setNetwork] = useState("Instagram");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState({ title: "", description: "", price: "", stock: "", imageUrl: "", saleMode: "store", expiresAt: "" });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productMessage, setProductMessage] = useState("");
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [ordersMessage, setOrdersMessage] = useState("");
  const [courier, setCourier] = useState<Record<number, { carrier: string; trackingCode: string }>>({});
  const [pickupPins, setPickupPins] = useState<Record<number, string>>({});
  const [balance, setBalance] = useState<SellerBalance>({ availableCents: 0, totalEarnedCents: 0 });
  const [withdrawal, setWithdrawal] = useState({ amount: "", method: "bank_transfer", destination: "" });
  const [withdrawalMessage, setWithdrawalMessage] = useState("");

  async function loadCatalog() {
    const [storeResponse, productsResponse] = await Promise.all([fetch("/api/stores"), fetch("/api/products")]);
    if (storeResponse.ok) {
      const payload = await storeResponse.json();
      if (payload.store) {
        setStore(payload.store);
        setName(payload.store.name);
        setNetwork(payload.store.socialNetwork);
      }
    }
    if (productsResponse.ok) {
      const payload = await productsResponse.json();
      setProducts(payload.products ?? []);
    }
  }

  async function loadOrders() {
    const response = await fetch("/api/seller/orders");
    const payload = await response.json();
    if (response.ok) setOrders(payload.orders ?? []);
    else setOrdersMessage(payload.error ?? "No se pudieron cargar los pedidos.");
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadCatalog(); void loadOrders(); }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void fetch("/api/seller/balance").then(async (response) => { if (response.ok) { const payload = await response.json(); setBalance(payload.balance); } }); }, 0); return () => window.clearTimeout(timer); }, []);

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const response = await fetch("/api/stores", { method: store ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, socialNetwork: network }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo crear el negocio."); return; }
    setStore(payload.store); setName(payload.store.name); setNetwork(payload.store.socialNetwork);
    setMessage(payload.existing ? "Tu negocio ya estaba configurado y quedó cargado." : store ? "Los datos de tu vitrina fueron actualizados." : "Tu negocio fue creado. El siguiente paso es completar la verificación.");
    void loadCatalog(); void loadOrders();
  }

  async function registerDelivery(order: SellerOrder) {
    const data = courier[order.id] ?? { carrier: "", trackingCode: "" };
    const response = await fetch(`/api/orders/${order.id}/delivery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const payload = await response.json();
    setOrdersMessage(response.ok ? "Despacho registrado. El comprador ya puede seguir su pedido." : payload.error ?? "No se pudo registrar el despacho.");
    if (response.ok) void loadOrders();
  }

  async function preparePickup(order: SellerOrder) {
    const response = await fetch(`/api/orders/${order.id}/delivery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "pickup" }) });
    const payload = await response.json();
    setOrdersMessage(response.ok ? "Entrega presencial preparada. El comprador recibió su PIN en su área segura." : payload.error ?? "No se pudo preparar la entrega.");
    if (response.ok) void loadOrders();
  }

  async function confirmPickup(order: SellerOrder) {
    const response = await fetch(`/api/orders/${order.id}/pickup-confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pickupPins[order.id] ?? "" }) });
    const payload = await response.json();
    setOrdersMessage(response.ok ? "Entrega confirmada y fondos liberados." : payload.error ?? "No se pudo validar el PIN.");
    if (response.ok) void loadOrders();
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!store) return;
    setProductMessage("");
    let imageUrl = product.imageUrl;
    if (productImage) {
      const imageData = new FormData(); imageData.set("storeId", String(store.id)); imageData.set("file", productImage);
      const imageResponse = await fetch("/api/products/image", { method: "POST", body: imageData });
      const imagePayload = await imageResponse.json();
      if (!imageResponse.ok) { setProductMessage(imagePayload.error ?? "No se pudo subir la imagen."); return; }
      imageUrl = imagePayload.imageUrl;
    }
    const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id, ...product, imageUrl }) });
    const payload = await response.json();
    if (!response.ok) { setProductMessage(payload.error ?? "No se pudo publicar el producto."); return; }
    setProducts((current) => [payload.product, ...current]); setProduct({ title: "", description: "", price: "", stock: "", imageUrl: "", saleMode: "store", expiresAt: "" }); setProductImage(null); setProductMessage(product.saleMode === "live" ? "Venta Live publicada por 24 horas." : "Producto publicado en tu vitrina.");
  }

  async function requestWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWithdrawalMessage("");
    const response = await fetch("/api/seller/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: Math.round(Number(withdrawal.amount) * 100), method: withdrawal.method, destination: withdrawal.destination }) });
    const payload = await response.json(); setWithdrawalMessage(response.ok ? "Solicitud enviada. El administrador revisará tu retiro." : payload.error ?? "No se pudo solicitar el retiro.");
    if (response.ok) { setBalance((current) => ({ ...current, availableCents: current.availableCents - Math.round(Number(withdrawal.amount) * 100) })); setWithdrawal({ amount: "", method: "bank_transfer", destination: "" }); }
  }

  async function updateProduct(productId: number) {
    const stock = Number(stockEdits[productId]);
    if (!Number.isInteger(stock) || stock < 0) { setProductMessage("Indica un stock entero igual o mayor a cero."); return; }
    const response = await fetch(`/api/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stock }) });
    const payload = await response.json();
    setProductMessage(response.ok ? "Stock actualizado." : payload.error ?? "No se pudo actualizar el stock.");
    if (response.ok) { setProducts(current => current.map(item => item.id === productId ? payload.product : item)); setStockEdits(current => ({ ...current, [productId]: "" })); }
  }

  return <main className="dashboard-shell">
    <nav className="dashboard-nav"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><span>Centro de negocios</span><Link href="/my-orders" prefetch={false}>Mis compras</Link><Link href="/profile" prefetch={false}>Perfil protegido</Link><button>Mi cuenta</button></nav>
    <section className="dashboard-hero"><div><p className="kicker">PRIMER PASO · NEGOCIO VERIFICADO</p><h1>Abre tu vitrina<br /><em>con respaldo.</em></h1><p className="lead">Crea el perfil público de tu negocio. Luego agregaremos productos, inventario y el checkout protegido.</p></div><div className="trust-card"><span>01</span><b>Datos del negocio</b><small>Necesarios para iniciar la verificación.</small><div className="progress"><i /></div><p>1 de 4 pasos</p></div></section>
    <section className="onboarding-grid"><form onSubmit={createStore} className="store-form"><h2>Cuéntanos sobre tu negocio</h2><p>Este nombre aparecerá en tu vitrina y enlaces de venta.</p><label>Nombre comercial<input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Casa Morena" required minLength={3} /></label><label>Red social principal<select value={network} onChange={e => setNetwork(e.target.value)}><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>WhatsApp</option></select></label><button disabled={loading}>{loading ? "Creando…" : "Crear mi vitrina →"}</button>{message && <output>{message}</output>}</form>
      <aside className="preview-card"><p className="kicker">VISTA PREVIA</p><div className="store-preview"><div className="preview-cover" /><div className="preview-avatar">{name ? name.slice(0,2).toUpperCase() : "TU"}</div><h3>{name || "Tu negocio"} <span>✓</span></h3><p>{network} · Pendiente de verificación</p><div className="preview-line" /><div className="preview-line short" /></div>{store && <div className="created-store"><b>/{store.slug}</b><span>Vitrina creada</span></div>}</aside>
    </section>
    {store && <section className="catalog-panel"><div><p className="kicker">SEGUNDO PASO · CATÁLOGO</p><h2>Publica tu primer producto</h2><p>Agrega artículos y controla el stock desde un solo lugar.</p><a className="storefront-link" href={`/s/${store.slug}`} target="_blank" rel="noreferrer">Ver vitrina pública ↗</a></div><form onSubmit={createProduct} className="product-form"><label>Nombre del producto<input value={product.title} onChange={e => setProduct({ ...product, title: e.target.value })} placeholder="Ej. Aros Sol" required /></label><label>Descripción<textarea value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })} placeholder="Describe materiales, medidas, colores y condiciones…" maxLength={2000} rows={4} /></label><div className="field-row"><label>Precio<input type="number" min="0.01" step="0.01" value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })} placeholder="22.00" required /></label><label>Stock<input type="number" min="0" step="1" value={product.stock} onChange={e => setProduct({ ...product, stock: e.target.value })} placeholder="10" required /></label></div><label>Imagen desde tu equipo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setProductImage(e.target.files?.[0] ?? null)} /></label><label>O usa una URL de imagen<input value={product.imageUrl} onChange={e => setProduct({ ...product, imageUrl: e.target.value })} placeholder="https://…" /></label><label>Modo de venta<select value={product.saleMode} onChange={e => setProduct({ ...product, saleMode: e.target.value })}><option value="store">Tienda permanente</option><option value="live">Venta Live temporal</option></select></label>{product.saleMode === "live" && <label>Finaliza (opcional)<input type="datetime-local" value={product.expiresAt} onChange={e => setProduct({ ...product, expiresAt: e.target.value })} /></label>}<button>Publicar producto →</button>{productMessage && <output>{productMessage}</output>}</form>{products.length > 0 && <div className="product-list">{products.map(item => <article key={item.id}><div><b>{item.title}</b>{item.description && <span>{item.description}</span>}<span>{item.saleMode === "live" ? "Venta Live · temporal" : "Tienda · permanente"} · {item.stock} unidades</span></div><div className="product-management"><strong>${(item.priceCents / 100).toFixed(2)}</strong><input type="number" min="0" step="1" value={stockEdits[item.id] ?? ""} placeholder={String(item.stock)} onChange={e => setStockEdits({ ...stockEdits, [item.id]: e.target.value })} /><button type="button" onClick={() => void updateProduct(item.id)}>Actualizar stock</button></div></article>)}</div>}</section>}
    <section className="orders-panel"><div className="orders-panel-head"><div><p className="kicker">OPERACIÓN · PEDIDOS Y ENTREGAS</p><h2>Gestiona tus ventas protegidas</h2><p>El pago queda retenido hasta que el comprador reciba el pedido.</p></div><NotificationsPanel /></div><div className="balance-strip"><div><span>Saldo retirable</span><strong>${(balance.availableCents / 100).toFixed(2)}</strong></div><div><span>Total ganado</span><strong>${(balance.totalEarnedCents / 100).toFixed(2)}</strong></div><small>Los fondos aparecen después de confirmar la entrega.</small></div><form className="withdrawal-form" onSubmit={requestWithdrawal}><label>Monto a retirar<input type="number" min="1" step="0.01" value={withdrawal.amount} onChange={e => setWithdrawal({ ...withdrawal, amount: e.target.value })} placeholder="50.00" required /></label><label>Método<select value={withdrawal.method} onChange={e => setWithdrawal({ ...withdrawal, method: e.target.value })}><option value="bank_transfer">Transferencia bancaria</option><option value="whatsapp">Coordinar por WhatsApp</option></select></label><label>Destino o referencia<input value={withdrawal.destination} onChange={e => setWithdrawal({ ...withdrawal, destination: e.target.value })} placeholder="Banco y número de cuenta" required /></label><button>Solicitar retiro</button>{withdrawalMessage && <output>{withdrawalMessage}</output>}</form>{ordersMessage && <output>{ordersMessage}</output>}{orders.length === 0 ? <p className="empty-state">Todavía no tienes pedidos asignados a este negocio.</p> : <div className="seller-orders">{orders.map(order => <article className="seller-order" key={order.id}><div className="seller-order-head"><div><b>Pedido #{order.id}</b><span>{order.product.title} · {order.quantity} unidad(es)</span></div><strong>${(order.totalCents / 100).toFixed(2)}</strong></div><div className="seller-order-status"><span className={`status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span><span>{order.deliveryMethod === "pickup" ? "Entrega presencial" : "Courier"}</span></div>{order.status === "payment_held" && order.deliveryMethod === "courier" && <div className="order-action"><input placeholder="Empresa de courier" value={courier[order.id]?.carrier ?? ""} onChange={e => setCourier({ ...courier, [order.id]: { carrier: e.target.value, trackingCode: courier[order.id]?.trackingCode ?? "" } })} /><input placeholder="Número de guía" value={courier[order.id]?.trackingCode ?? ""} onChange={e => setCourier({ ...courier, [order.id]: { carrier: courier[order.id]?.carrier ?? "", trackingCode: e.target.value } })} /><button onClick={() => void registerDelivery(order)}>Registrar despacho</button></div>}{order.status === "payment_held" && order.deliveryMethod === "pickup" && <div className="order-action"><button onClick={() => void preparePickup(order)}>Preparar entrega y generar PIN</button></div>}{order.status === "ready_for_pickup" && <div className="order-action"><input inputMode="numeric" maxLength={6} placeholder="PIN de 6 dígitos" value={pickupPins[order.id] ?? ""} onChange={e => setPickupPins({ ...pickupPins, [order.id]: e.target.value.replace(/\D/g, "").slice(0, 6) })} /><button onClick={() => void confirmPickup(order)}>Validar entrega presencial</button></div>}</article>)}</div>}</section>
  </main>;
}
