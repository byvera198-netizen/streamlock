"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import NotificationsPanel from "./components/notifications-panel";
import { readJson } from "../lib/client-json";

type Store = { id: number; name: string; slug: string; socialNetwork: string; status: string };
type Product = { id: number; title: string; description: string; category: string; brand: string; model: string; storage: string | null; color: string | null; condition: string; warrantyMonths: number; priceCents: number; stock: number; status: string; saleMode: string; expiresAt: string | null };
type SellerOrder = { id: number; totalCents: number; status: string; deliveryMethod: string; quantity: number; product: Product; delivery: { method: string; carrier: string | null; trackingCode: string | null; status: string; pickupPin: string | null } | null };
type SellerBalance = { availableCents: number; totalEarnedCents: number };

type DashboardUser = { displayName: string; email: string };
type ProductReferenceDraft = { title?: string; category?: string; brand?: string; model?: string; storage?: string; price?: string };

export default function DashboardClient({ user, signInHref, signOutHref }: { user: DashboardUser | null; signInHref: string; signOutHref: string }) {
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [network, setNetwork] = useState("Instagram");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState({ title: "", description: "", category: "mobile", brand: "", model: "", storage: "", color: "", condition: "new", warrantyMonths: "", price: "", stock: "", imageUrl: "", saleMode: "store", expiresAt: "" });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productMessage, setProductMessage] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productEdits, setProductEdits] = useState<Record<number, { title: string; description: string; category: string; brand: string; model: string; storage: string; color: string; condition: string; warrantyMonths: string; price: string; stock: string; saleMode: string; expiresAt: string }>>({});
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
      const payload = await readJson(storeResponse);
      if (payload.store) {
        setStore(payload.store);
        setName(payload.store.name);
        setNetwork(payload.store.socialNetwork);
      }
    }
    if (productsResponse.ok) {
      const payload = await readJson(productsResponse);
      setProducts((payload.products ?? []).filter((item: Product) => item.status === "published"));
    }
  }

  async function loadOrders() {
    const response = await fetch("/api/seller/orders");
    const payload = await readJson(response);
    if (response.ok) setOrders(payload.orders ?? []);
    else setOrdersMessage(payload.error ?? "No se pudieron cargar los pedidos.");
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadCatalog(); void loadOrders(); }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { const params = new URLSearchParams(window.location.search); const raw = params.get("reference") ?? window.localStorage.getItem("streamlock-product-draft"); if (!raw) return; try { const reference = JSON.parse(raw) as ProductReferenceDraft; setProduct(current => ({ ...current, title: reference.title ?? current.title, category: reference.category ?? current.category, brand: reference.brand ?? current.brand, model: reference.model ?? current.model, storage: reference.storage ?? current.storage, price: reference.price ?? current.price })); window.localStorage.setItem("streamlock-product-draft", JSON.stringify(reference)); setProductMessage("Referencia cargada como borrador. Revisa los datos antes de publicar."); if (params.has("reference")) window.history.replaceState({}, "", "/"); } catch { window.localStorage.removeItem("streamlock-product-draft"); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (productMessage.includes("publicada") || productMessage.includes("publicado")) window.localStorage.removeItem("streamlock-product-draft"); }, [productMessage]);
  useEffect(() => { const timer = window.setTimeout(() => { void fetch("/api/seller/balance").then(async (response) => { if (response.ok) { const payload = await readJson(response); setBalance(payload.balance); } }); }, 0); return () => window.clearTimeout(timer); }, []);

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const response = await fetch("/api/stores", { method: store ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, socialNetwork: network }) });
    const payload = await readJson(response);
    setLoading(false);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo crear el negocio."); return; }
    setStore(payload.store); setName(payload.store.name); setNetwork(payload.store.socialNetwork);
    setMessage(payload.existing ? "Tu negocio ya estaba configurado y quedó cargado." : store ? "Los datos de tu vitrina fueron actualizados." : "Tu negocio fue creado. El siguiente paso es completar la verificación.");
    void loadCatalog(); void loadOrders();
  }

  async function registerDelivery(order: SellerOrder) {
    const data = courier[order.id] ?? { carrier: "", trackingCode: "" };
    const response = await fetch(`/api/orders/${order.id}/delivery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const payload = await readJson(response);
    setOrdersMessage(response.ok ? "Despacho registrado. El comprador ya puede seguir su pedido." : payload.error ?? "No se pudo registrar el despacho.");
    if (response.ok) void loadOrders();
  }

  async function preparePickup(order: SellerOrder) {
    const response = await fetch(`/api/orders/${order.id}/delivery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "pickup" }) });
    const payload = await readJson(response);
    setOrdersMessage(response.ok ? "Entrega presencial preparada. El comprador recibió su PIN en su área segura." : payload.error ?? "No se pudo preparar la entrega.");
    if (response.ok) void loadOrders();
  }

  async function confirmPickup(order: SellerOrder) {
    const response = await fetch(`/api/orders/${order.id}/pickup-confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pickupPins[order.id] ?? "" }) });
    const payload = await readJson(response);
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
      const imagePayload = await readJson(imageResponse);
      if (!imageResponse.ok) { setProductMessage(imagePayload.error ?? "No se pudo subir la imagen."); return; }
      imageUrl = imagePayload.imageUrl;
    }
    const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id, ...product, warrantyMonths: Number(product.warrantyMonths || 0), imageUrl }) });
    const payload = await readJson(response);
    if (!response.ok) { setProductMessage(payload.error ?? "No se pudo publicar el producto."); return; }
    setProducts((current) => [payload.product, ...current]); setProduct({ title: "", description: "", category: "mobile", brand: "", model: "", storage: "", color: "", condition: "new", warrantyMonths: "", price: "", stock: "", imageUrl: "", saleMode: "store", expiresAt: "" }); setProductImage(null); setProductMessage(product.saleMode === "live" ? "Venta Live publicada por 24 horas." : "Producto publicado en tu vitrina.");
  }

  async function requestWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWithdrawalMessage("");
    const response = await fetch("/api/seller/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: Math.round(Number(withdrawal.amount) * 100), method: withdrawal.method, destination: withdrawal.destination }) });
    const payload = await readJson(response); setWithdrawalMessage(response.ok ? "Solicitud enviada. El administrador revisará tu retiro." : payload.error ?? "No se pudo solicitar el retiro.");
    if (response.ok) { setBalance((current) => ({ ...current, availableCents: current.availableCents - Math.round(Number(withdrawal.amount) * 100) })); setWithdrawal({ amount: "", method: "bank_transfer", destination: "" }); }
  }

  async function updateProduct(productId: number) {
    const edit = productEdits[productId];
    if (!edit) return;
    const stock = Number(edit.stock);
    const price = Number(edit.price);
    const warrantyMonths = Number(edit.warrantyMonths || 0);
    if (!edit.title.trim() || edit.title.trim().length < 2 || edit.description.length > 2000 || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 120) { setProductMessage("Completa nombre, descripción, precio, stock y garantía con valores válidos."); return; }
    const response = await fetch(`/api/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: edit.title, description: edit.description, category: edit.category, brand: edit.brand, model: edit.model, storage: edit.storage || null, color: edit.color || null, condition: edit.condition, warrantyMonths, price, stock, saleMode: edit.saleMode, expiresAt: edit.expiresAt || null }) });
    const payload = await readJson(response);
    setProductMessage(response.ok ? "Producto actualizado." : payload.error ?? "No se pudo actualizar el producto.");
    if (response.ok) { setProducts(current => current.map(item => item.id === productId ? payload.product : item)); setEditingProductId(null); setProductEdits(current => { const next = { ...current }; delete next[productId]; return next; }); }
  }

  async function archiveProduct(item: Product) {
    if (!window.confirm(`¿Retirar “${item.title}” de tu vitrina? Se conservará el historial y no se borrará una orden existente.`)) return;
    const response = await fetch(`/api/products/${item.id}`, { method: "DELETE" });
    const payload = await readJson(response);
    setProductMessage(response.ok ? "Producto retirado de tu vitrina." : payload.error ?? "No se pudo retirar el producto.");
    if (response.ok) setProducts(current => current.filter(product => product.id !== item.id));
  }

  function startEditingProduct(item: Product) {
    setEditingProductId(item.id);
    setProductEdits(current => ({ ...current, [item.id]: { title: item.title, description: item.description, category: item.category, brand: item.brand, model: item.model, storage: item.storage ?? "", color: item.color ?? "", condition: item.condition, warrantyMonths: String(item.warrantyMonths), price: (item.priceCents / 100).toFixed(2), stock: String(item.stock), saleMode: item.saleMode, expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : "" } }));
    setProductMessage("");
  }

  return <main className="dashboard-shell">
    <nav className="dashboard-nav"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><span>Centro de negocios</span><Link href="/my-orders" prefetch={false}>Mis compras</Link><Link href="/profile" prefetch={false}>Perfil protegido</Link>{user ? <a href={signOutHref} target="_top" rel="noreferrer" className="account-link">{user.displayName} · Cerrar sesión</a> : <a href={signInHref} target="_top" rel="noreferrer" className="account-link">Iniciar sesión</a>}</nav>
    <section className="dashboard-hero"><div><p className="kicker">PRIMER PASO · NEGOCIO VERIFICADO</p><h1>Abre tu vitrina<br /><em>con respaldo.</em></h1><p className="lead">Crea el perfil público de tu negocio. Luego agregaremos productos, inventario y el checkout protegido.</p></div><div className="trust-card"><span>01</span><b>Datos del negocio</b><small>Necesarios para iniciar la verificación.</small><div className="progress"><i /></div><p>1 de 4 pasos</p></div></section>
    <section className="onboarding-grid"><form onSubmit={createStore} className="store-form"><h2>Cuéntanos sobre tu negocio</h2><p>Este nombre aparecerá en tu vitrina y enlaces de venta.</p><label>Nombre comercial<input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Casa Morena" required minLength={3} /></label><label>Red social principal<select value={network} onChange={e => setNetwork(e.target.value)}><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>WhatsApp</option></select></label><button disabled={loading}>{loading ? "Creando…" : "Crear mi vitrina →"}</button>{message && <output>{message}</output>}</form>
      <aside className="preview-card"><p className="kicker">VISTA PREVIA</p><div className="store-preview"><div className="preview-cover" /><div className="preview-avatar">{name ? name.slice(0,2).toUpperCase() : "TU"}</div><h3>{name || "Tu negocio"} <span>✓</span></h3><p>{network} · Pendiente de verificación</p><div className="preview-line" /><div className="preview-line short" /></div>{store && <div className="created-store"><b>/{store.slug}</b><span>Vitrina creada</span></div>}</aside>
    </section>
    {store && <section className="catalog-panel"><div><p className="kicker">SEGUNDO PASO · CATÁLOGO</p><h2>Publica tu inventario</h2><p>Agrega celulares, iPhone y accesorios con sus especificaciones verificables.</p><a className="storefront-link" href={`/s/${store.slug}`} target="_blank" rel="noreferrer">Ver vitrina pública ↗</a></div><form onSubmit={createProduct} className="product-form"><label>Nombre del producto<input value={product.title} onChange={e => setProduct({ ...product, title: e.target.value })} placeholder="Ej. iPhone 17 Pro 256GB" required /></label><div className="field-row"><label>Categoría<select value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })}><option value="mobile">Celular / smartphone</option><option value="accessory">Accesorio</option><option value="general">Otro producto</option></select></label><label>Marca<input value={product.brand} onChange={e => setProduct({ ...product, brand: e.target.value })} placeholder="Apple, Samsung…" /></label></div><div className="field-row"><label>Modelo<input value={product.model} onChange={e => setProduct({ ...product, model: e.target.value })} placeholder="iPhone 17 Pro" /></label><label>Almacenamiento<input value={product.storage} onChange={e => setProduct({ ...product, storage: e.target.value })} placeholder="256 GB" /></label></div><div className="field-row"><label>Color<input value={product.color} onChange={e => setProduct({ ...product, color: e.target.value })} placeholder="Plata, negro…" /></label><label>Condición<select value={product.condition} onChange={e => setProduct({ ...product, condition: e.target.value })}><option value="new">Nuevo</option><option value="used">Usado</option><option value="refurbished">Reacondicionado</option></select></label></div><div className="field-row"><label>Garantía (meses)<input type="number" min="0" max="120" step="1" value={product.warrantyMonths} onChange={e => setProduct({ ...product, warrantyMonths: e.target.value })} placeholder="12" /></label><label>Stock<input type="number" min="0" step="1" value={product.stock} onChange={e => setProduct({ ...product, stock: e.target.value })} placeholder="10" required /></label></div><label>Descripción<textarea value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })} placeholder="Incluye estado, garantía, accesorios y condiciones…" maxLength={2000} rows={4} /></label><label>Precio<input type="number" min="0.01" step="0.01" value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })} placeholder="1099.00" required /></label><label>Imagen desde tu equipo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setProductImage(e.target.files?.[0] ?? null)} /></label><label>O usa una URL de imagen<input value={product.imageUrl} onChange={e => setProduct({ ...product, imageUrl: e.target.value })} placeholder="https://…" /></label><label>Modo de venta<select value={product.saleMode} onChange={e => setProduct({ ...product, saleMode: e.target.value })}><option value="store">Tienda permanente</option><option value="live">Venta Live temporal</option></select></label>{product.saleMode === "live" && <label>Finaliza (opcional)<input type="datetime-local" value={product.expiresAt} onChange={e => setProduct({ ...product, expiresAt: e.target.value })} /></label>}<button>Publicar producto →</button>{productMessage && <output>{productMessage}</output>}</form>{products.length > 0 && <div className="product-list">{products.map(item => { const edit = productEdits[item.id]; return <article key={item.id}>{editingProductId === item.id && edit ? <div className="product-edit-form"><label>Nombre<input value={edit.title} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, title: e.target.value } })} /></label><div className="field-row"><label>Categoría<select value={edit.category} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, category: e.target.value } })}><option value="mobile">Celular / smartphone</option><option value="accessory">Accesorio</option><option value="general">Otro producto</option></select></label><label>Marca<input value={edit.brand} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, brand: e.target.value } })} /></label></div><div className="field-row"><label>Modelo<input value={edit.model} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, model: e.target.value } })} /></label><label>Almacenamiento<input value={edit.storage} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, storage: e.target.value } })} /></label></div><div className="field-row"><label>Color<input value={edit.color} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, color: e.target.value } })} /></label><label>Condición<select value={edit.condition} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, condition: e.target.value } })}><option value="new">Nuevo</option><option value="used">Usado</option><option value="refurbished">Reacondicionado</option></select></label></div><div className="field-row"><label>Garantía (meses)<input type="number" min="0" max="120" step="1" value={edit.warrantyMonths} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, warrantyMonths: e.target.value } })} /></label><label>Stock<input type="number" min="0" step="1" value={edit.stock} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, stock: e.target.value } })} /></label></div><label>Descripción<textarea value={edit.description} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, description: e.target.value } })} maxLength={2000} rows={3} /></label><div className="field-row"><label>Precio<input type="number" min="0.01" step="0.01" value={edit.price} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, price: e.target.value } })} /></label><label>Modo de venta<select value={edit.saleMode} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, saleMode: e.target.value, expiresAt: e.target.value === "store" ? "" : edit.expiresAt } })}><option value="store">Tienda permanente</option><option value="live">Venta Live temporal</option></select></label></div>{edit.saleMode === "live" && <label>Finaliza<input type="datetime-local" value={edit.expiresAt} onChange={e => setProductEdits({ ...productEdits, [item.id]: { ...edit, expiresAt: e.target.value } })} /></label>}<div className="product-edit-actions"><button type="button" onClick={() => void updateProduct(item.id)}>Guardar cambios</button><button type="button" className="secondary-action" onClick={() => { setEditingProductId(null); setProductMessage(""); }}>Cancelar</button></div></div> : <><div><b>{item.title}</b>{item.description && <span>{item.description}</span>}<span>{[item.brand && item.model ? `${item.brand} ${item.model}` : item.brand || item.model, item.storage, item.color, item.condition === "new" ? "Nuevo" : item.condition === "used" ? "Usado" : item.condition === "refurbished" ? "Reacondicionado" : item.condition, item.warrantyMonths ? `${item.warrantyMonths} meses de garantía` : null].filter(Boolean).join(" · ")}</span><span>{item.saleMode === "live" ? "Venta Live · temporal" : "Tienda · permanente"} · {item.stock} unidades</span></div><div className="product-management"><strong>${(item.priceCents / 100).toFixed(2)}</strong><button type="button" onClick={() => void archiveProduct(item)}>Retirar producto</button><button type="button" onClick={() => startEditingProduct(item)}>Editar producto</button></div></>}</article>; })}</div>}</section>}
    <section className="orders-panel"><div className="orders-panel-head"><div><p className="kicker">OPERACIÓN · PEDIDOS Y ENTREGAS</p><h2>Gestiona tus ventas protegidas</h2><p>El pago queda retenido hasta que el comprador reciba el pedido.</p></div><NotificationsPanel /></div><div className="balance-strip"><div><span>Saldo retirable</span><strong>${(balance.availableCents / 100).toFixed(2)}</strong></div><div><span>Total ganado</span><strong>${(balance.totalEarnedCents / 100).toFixed(2)}</strong></div><small>Los fondos aparecen después de confirmar la entrega.</small></div><form className="withdrawal-form" onSubmit={requestWithdrawal}><label>Monto a retirar<input type="number" min="1" step="0.01" value={withdrawal.amount} onChange={e => setWithdrawal({ ...withdrawal, amount: e.target.value })} placeholder="50.00" required /></label><label>Método<select value={withdrawal.method} onChange={e => setWithdrawal({ ...withdrawal, method: e.target.value })}><option value="bank_transfer">Transferencia bancaria</option><option value="whatsapp">Coordinar por WhatsApp</option></select></label><label>Destino o referencia<input value={withdrawal.destination} onChange={e => setWithdrawal({ ...withdrawal, destination: e.target.value })} placeholder="Banco y número de cuenta" required /></label><button>Solicitar retiro</button>{withdrawalMessage && <output>{withdrawalMessage}</output>}</form>{ordersMessage && <output>{ordersMessage}</output>}{orders.length === 0 ? <p className="empty-state">Todavía no tienes pedidos asignados a este negocio.</p> : <div className="seller-orders">{orders.map(order => <article className="seller-order" key={order.id}><div className="seller-order-head"><div><b>Pedido #{order.id}</b><span>{order.product.title} · {order.quantity} unidad(es)</span></div><strong>${(order.totalCents / 100).toFixed(2)}</strong></div><div className="seller-order-status"><span className={`status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span><span>{order.deliveryMethod === "pickup" ? "Entrega presencial" : "Courier"}</span></div>{order.status === "payment_held" && order.deliveryMethod === "courier" && <div className="order-action"><input placeholder="Empresa de courier" value={courier[order.id]?.carrier ?? ""} onChange={e => setCourier({ ...courier, [order.id]: { carrier: e.target.value, trackingCode: courier[order.id]?.trackingCode ?? "" } })} /><input placeholder="Número de guía" value={courier[order.id]?.trackingCode ?? ""} onChange={e => setCourier({ ...courier, [order.id]: { carrier: courier[order.id]?.carrier ?? "", trackingCode: e.target.value } })} /><button onClick={() => void registerDelivery(order)}>Registrar despacho</button></div>}{order.status === "payment_held" && order.deliveryMethod === "pickup" && <div className="order-action"><button onClick={() => void preparePickup(order)}>Preparar entrega y generar PIN</button></div>}{order.status === "ready_for_pickup" && <div className="order-action"><input inputMode="numeric" maxLength={6} placeholder="PIN de 6 dígitos" value={pickupPins[order.id] ?? ""} onChange={e => setPickupPins({ ...pickupPins, [order.id]: e.target.value.replace(/\D/g, "").slice(0, 6) })} /><button onClick={() => void confirmPickup(order)}>Validar entrega presencial</button></div>}</article>)}</div>}</section>
  </main>;
}
