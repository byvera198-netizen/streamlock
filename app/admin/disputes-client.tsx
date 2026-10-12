"use client";

import { useEffect, useState } from "react";

type Dispute = { dispute: { id: number; orderId: number; reason: string; description: string; createdAt: string }; product: { title: string }; store: { name: string } };
const reasonLabels: Record<string, string> = { not_received: "No recibió el producto", damaged: "Producto dañado", not_as_described: "No coincide con la publicación", other: "Otro problema" };

export default function AdminDisputesClient() {
  const [items, setItems] = useState<Dispute[]>([]);
  const [message, setMessage] = useState("Cargando disputas…");
  const [resolution, setResolution] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/admin/disputes");
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar las disputas."); return; }
    setItems(payload.disputes ?? []); setMessage(payload.disputes?.length ? "" : "No hay disputas pendientes.");
  }

  async function decide(disputeId: number, decision: "refund" | "release" | "reject") {
    const text = resolution[disputeId]?.trim();
    if (!text) { setMessage("Escribe una resolución antes de cerrar la disputa."); return; }
    setBusy(disputeId);
    const response = await fetch("/api/admin/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disputeId, decision, resolution: text }) });
    const payload = await response.json(); setBusy(null);
    setMessage(response.ok ? `Orden #${payload.orderId}: disputa resuelta.` : payload.error ?? "No se pudo resolver la disputa.");
    if (response.ok) await load();
  }

  useEffect(() => { void load(); }, []);

  return <section className="admin-content admin-disputes"><p className="kicker">SEGURIDAD Y MEDIACIÓN</p><h1>Disputas abiertas</h1><p className="admin-lead">Revisa los reclamos antes de decidir el destino de los fondos retenidos.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(item => <article className="admin-transfer dispute-card" key={item.dispute.id}><div><p className="kicker">ORDEN #{item.dispute.orderId} · {reasonLabels[item.dispute.reason] ?? item.dispute.reason}</p><h2>{item.product.title}</h2><p>{item.store.name} · Abierta el {new Date(item.dispute.createdAt).toLocaleString()}</p><blockquote>{item.dispute.description}</blockquote></div><div className="admin-actions dispute-actions"><textarea placeholder="Resolución registrada" value={resolution[item.dispute.id] ?? ""} onChange={e => setResolution({ ...resolution, [item.dispute.id]: e.target.value })} /><button disabled={busy === item.dispute.id} onClick={() => void decide(item.dispute.id, "refund")}>Reembolsar comprador</button><button disabled={busy === item.dispute.id} onClick={() => void decide(item.dispute.id, "release")}>Liberar al vendedor</button><button className="reject" disabled={busy === item.dispute.id} onClick={() => void decide(item.dispute.id, "reject")}>Rechazar reclamo</button></div></article>)}</div></section>;
}
