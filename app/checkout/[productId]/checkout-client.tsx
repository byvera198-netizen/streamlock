"use client";

import { FormEvent, useMemo, useState } from "react";

type Product = { id: number; title: string; priceCents: number; stock: number; imageUrl: string | null };
type Store = { name: string; slug: string };

export default function CheckoutClient({ product, store }: { product: Product; store: Store }) {
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState("courier");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const subtotal = useMemo(() => product.priceCents * quantity, [product.priceCents, quantity]);
  const fee = Math.round(subtotal * 0.07);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, quantity, deliveryMethod }) });
    const payload = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo iniciar la orden."); return; }
    setMessage(`Orden #${payload.order.id} creada. El pago quedará retenido en custodia cuando la pasarela confirme la transacción.`);
  }

  return <main className="checkout-shell"><header className="storefront-header"><a href="/" className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></a><span className="secure-label">Checkout protegido · {store.name}</span></header><section className="checkout-card"><div className="checkout-product"><div className="checkout-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.title} /> : product.title.slice(0, 1).toUpperCase()}</div><p className="kicker">COMPRA PROTEGIDA</p><h1>{product.title}</h1><p className="checkout-muted">Vendido por {store.name}. El vendedor no recibe los fondos hasta validar la entrega.</p><strong className="checkout-price">${(product.priceCents / 100).toFixed(2)}</strong></div><form className="checkout-form" onSubmit={createOrder}><label>Cantidad<select value={quantity} onChange={event => setQuantity(Number(event.target.value))}>{Array.from({ length: Math.min(product.stock, 20) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><label>Entrega<select value={deliveryMethod} onChange={event => setDeliveryMethod(event.target.value)}><option value="courier">Courier / encomienda</option><option value="pickup">Entrega presencial</option></select></label><div className="checkout-summary"><span>Subtotal <b>${(subtotal / 100).toFixed(2)}</b></span><span>Servicio de custodia (7%) <b>${(fee / 100).toFixed(2)}</b></span><span>Total <b>${((subtotal + fee) / 100).toFixed(2)}</b></span></div><button disabled={busy || product.stock < 1}>{busy ? "Creando orden…" : "Continuar al pago seguro →"}</button>{message && <output>{message}</output>}<small>La orden se crea como pendiente de pago. El cobro real se habilitará al conectar una pasarela compatible.</small></form></section></main>;
}
