"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NotificationsPanel from "../components/notifications-panel";

type BuyerOrder = {
  id: number; totalCents: number; status: string; deliveryMethod: string; quantity: number;
  product: { title: string; imageUrl: string | null };
  store: { name: string; slug: string };
  delivery: { method: string; carrier: string | null; trackingCode: string | null; status: string } | null;
};

const labels: Record<string, string> = { payment_pending: "Pago pendiente", payment_held: "Pago protegido", shipped: "En camino", ready_for_pickup: "Listo para retirar", completed: "Completada", payment_failed: "Pago rechazado", refunded: "Reembolsada" };

function productImageSrc(imageUrl: string | null) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("r2://") ? `/api/products/media?key=${encodeURIComponent(imageUrl.slice(5))}` : imageUrl;
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [message, setMessage] = useState("");
  const [disputeReason, setDisputeReason] = useState<Record<number, string>>({});
  const [disputeDescription, setDisputeDescription] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    const response = await fetch("/api/orders");
    const payload = await response.json();
    setLoading(false);
    if (response.ok) setOrders(payload.orders ?? []);
    else setMessage(payload.error ?? "Inicia sesión para ver tus compras.");
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadOrders(); }, 0); return () => window.clearTimeout(timer); }, []);

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

  async function openDispute(orderId: number) {
    const response = await fetch(`/api/orders/${orderId}/dispute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: disputeReason[orderId] ?? "other", description: disputeDescription[orderId] ?? "" }) });
    const payload = await response.json();
    setMessage(response.ok ? "Disputa abierta. El pedido queda protegido mientras el administrador revisa el caso." : payload.error ?? "No se pudo abrir la disputa.");
    if (response.ok) void loadOrders();
  }

  async function cancelOrder(orderId: number) {
    const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
    const payload = await response.json();
    setMessage(response.ok ? `La orden #${orderId} fue cancelada y el stock quedó liberado.` : payload.error ?? "No se pudo cancelar la orden.");
    if (response.ok) void loadOrders();
  }

  return <main className="orders-shell"><header className="storefront-header"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><nav><Link href="/" prefetch={false}>Centro de negocios</Link></nav></header><section className="orders-content"><div className="orders-topbar"><div><p className="kicker">MI EXPERIENCIA STREAMLOCK</p><h1>Tus compras<br /><em>protegidas.</em></h1><p className="orders-lead">Consulta el estado de cada pedido. El dinero permanece protegido hasta confirmar la entrega.</p></div><NotificationsPanel /></div>{message && <output className="orders-message">{message}</output>}{loading ? <p>Cargando tus pedidos…</p> : orders.length === 0 ? <div className="empty-state">No tienes compras todavía. Cuando realices una compra, aparecerá aquí.</div> : <div className="buyer-orders">{orders.map(order => <article className="buyer-order" key={order.id}><div className="buyer-order-image">{productImageSrc(order.product.imageUrl) ? <img src={productImageSrc(order.product.imageUrl) ?? undefined} alt="" /> : order.product.title.slice(0, 1).toUpperCase()}</div><div className="buyer-order-info"><div className="buyer-order-head"><div><span className="order-number">PEDIDO #{order.id}</span><h2>{order.product.title}</h2><p>Vendido por {order.store.name} · {order.quantity} unidad(es)</p></div><strong>${(order.totalCents / 100).toFixed(2)}</strong></div><div className="buyer-order-status"><span className={`status-pill status-${order.status}`}>{labels[order.status] ?? order.status.replaceAll("_", " ")}</span>{order.deliveryMethod === "pickup" ? <span>Entrega presencial</span> : <span>{order.delivery?.carrier ? `${order.delivery.carrier} · ${order.delivery.trackingCode}` : "Courier pendiente"}</span>}</div><div className="buyer-order-actions">{order.status === "payment_pending" && <button onClick={() => void cancelOrder(order.id)}>Cancelar orden</button>}{order.status === "ready_for_pickup" && <button onClick={() => void showPin(order.id)}>Mostrar mi PIN</button>}{order.status === "shipped" && <button onClick={() => void confirmReceipt(order.id)}>Confirmar recepción</button>}{order.status === "completed" && <small>✓ Fondos liberados después de la entrega</small>}</div>{["shipped", "ready_for_pickup", "completed"].includes(order.status) && <div className="dispute-box"><b>¿Algo salió mal?</b><div><select value={disputeReason[order.id] ?? "other"} onChange={e => setDisputeReason({ ...disputeReason, [order.id]: e.target.value })}><option value="not_received">No recibí el producto</option><option value="damaged">Llegó dañado</option><option value="not_as_described">No coincide con la publicación</option><option value="other">Otro problema</option></select><textarea value={disputeDescription[order.id] ?? ""} onChange={e => setDisputeDescription({ ...disputeDescription, [order.id]: e.target.value })} placeholder="Describe el problema…" maxLength={2000} /><button className="dispute-button" onClick={() => void openDispute(order.id)}>Abrir disputa</button></div></div>}</div></article>)}</div>}</section></main>;
}
