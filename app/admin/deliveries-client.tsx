"use client";

import { useEffect, useState } from "react";

type Shipment = { delivery: { orderId: number; carrier: string | null; trackingCode: string | null; status: string }; order: { id: number; buyerId: string }; product: { title: string }; store: { name: string } };

export default function AdminDeliveriesClient() {
  const [items, setItems] = useState<Shipment[]>([]);
  const [message, setMessage] = useState("Cargando despachos…");
  const [busy, setBusy] = useState<number | null>(null);
  async function load() { const response = await fetch("/api/admin/deliveries"); const payload = await response.json(); if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar los despachos."); return; } setItems(payload.deliveries ?? []); setMessage(payload.deliveries?.length ? "" : "No hay despachos pendientes de confirmación."); }
  async function confirm(orderId: number) { setBusy(orderId); const response = await fetch("/api/admin/deliveries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) }); const payload = await response.json(); setBusy(null); setMessage(response.ok ? `Pedido #${orderId}: entrega registrada. La liberación automática queda programada en 24 horas.` : payload.error ?? "No se pudo registrar la entrega."); if (response.ok) await load(); }
  useEffect(() => { void load(); }, []);
  return <section className="admin-content admin-disputes"><p className="kicker">LOGÍSTICA · CUSTODIA</p><h1>Confirmar entregas courier</h1><p className="admin-lead">Registra la entrega confirmada por el courier. El sistema libera los fondos después de 24 horas si no se abre una disputa.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(item => <article className="admin-transfer" key={item.order.id}><div><p className="kicker">PEDIDO #{item.order.id}</p><h2>{item.product.title}</h2><p>{item.store.name} · Comprador: {item.order.buyerId}</p><p>Courier: <b>{item.delivery.carrier ?? "—"}</b> · Guía: <b>{item.delivery.trackingCode ?? "—"}</b></p></div><div className="admin-actions"><button disabled={busy === item.order.id} onClick={() => void confirm(item.order.id)}>Confirmar entrega</button></div></article>)}</div></section>;
}
