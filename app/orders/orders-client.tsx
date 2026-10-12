"use client";

import { useEffect, useState } from "react";

type BuyerOrder = {
  id: number; totalCents: number; status: string; deliveryMethod: string; quantity: number;
  product: { title: string; imageUrl: string | null };
  store: { name: string; slug: string };
  delivery: { method: string; carrier: string | null; trackingCode: string | null; status: string } | null;
};

const labels: Record<string, string> = { payment_pending: "Pago pendiente", payment_held: "Pago protegido", shipped: "En camino", ready_for_pickup: "Listo para retirar", completed: "Completada", payment_failed: "Pago rechazado", refunded: "Reembolsada" };

export default function OrdersClient() {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [message, setMessage] = useState("");
  const [pins, setPins] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    const response = await fetch("/api/orders");
    const payload = await response.json();
    setLoading(false);
    if (response.ok) setOrders(payload.orders ?? []);
    else setMessage(payload.error ?? "Inicia sesión para ver tus compras.");
  }

  useEffect(() => { void loadOrders(); }, []);

  async function showPin(orderId: number) {
    const response = await fetch(`/api/orders/${orderId}/pickup-pin`);
    const payload = await response.json();
    setMessage(response.ok ? `PIN de retiro para el pedido #${orderId}: ${payload.pickupPin}. Válido hasta ${new Date(payload.expiresAt).toLocaleString()}.` : payload.error ?? "No se pudo consultar el PIN.");
  }

  async function confirmReceipt(orderId: number) {
    const response = await fetch(`/api/orders/${orderId}/confirm`, { method: "POST" });
    const payload = await response.json();
    setMessage(response.ok ? "Recepción confirmada. El pago fue liberado al vendedor." : payload.error ?? "No se pudo confirmar la recepción.");
    if (response.ok) void loadOrders();
  }

  return <main className="orders-shell"><header className="storefront-header"><a href="/" className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></a><nav><a href="/">Centro de negocios</a></nav></header><section className="orders-content"><p className="kicker">MI EXPERIENCIA STREAMLOCK</p><h1>Tus compras<br /><em>protegidas.</em></h1><p className="orders-lead">Consulta el estado de cada pedido. El dinero permanece protegido hasta confirmar la entrega.</p>{message && <output className="orders-message">{message}</output>}{loading ? <p>Cargando tus pedidos…</p> : orders.length === 0 ? <div className="empty-state">No tienes compras todavía. Cuando realices una compra, aparecerá aquí.</div> : <div className="buyer-orders">{orders.map(order => <article className="buyer-order" key={order.id}><div className="buyer-order-image">{order.product.imageUrl ? <img src={order.product.imageUrl} alt="" /> : order.product.title.slice(0, 1).toUpperCase()}</div><div className="buyer-order-info"><div className="buyer-order-head"><div><span className="order-number">PEDIDO #{order.id}</span><h2>{order.product.title}</h2><p>Vendido por {order.store.name} · {order.quantity} unidad(es)</p></div><strong>${(order.totalCents / 100).toFixed(2)}</strong></div><div className="buyer-order-status"><span className={`status-pill status-${order.status}`}>{labels[order.status] ?? order.status.replaceAll("_", " ")}</span>{order.deliveryMethod === "pickup" ? <span>Entrega presencial</span> : <span>{order.delivery?.carrier ? `${order.delivery.carrier} · ${order.delivery.trackingCode}` : "Courier pendiente"}</span>}</div><div className="buyer-order-actions">{order.status === "ready_for_pickup" && <button onClick={() => void showPin(order.id)}>Mostrar mi PIN</button>}{order.status === "shipped" && <button onClick={() => void confirmReceipt(order.id)}>Confirmar recepción</button>}{order.status === "completed" && <small>✓ Fondos liberados después de la entrega</small>}</div></div></article>)}</div>}</section></main>;
}
