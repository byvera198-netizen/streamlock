"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readJson } from "../../lib/client-json";

type Transfer = { submission: { id: number; bank: string; reference: string; amountCents: number; receiptUrl: string | null; submittedAt: string }; order: { id: number; buyerId: string }; product: { title: string }; store: { name: string } };

export default function AdminTransfersClient() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [message, setMessage] = useState("Cargando comprobantes…");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/admin/bank-transfers");
    const payload = await readJson(response);
    if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar los comprobantes."); return; }
    setTransfers(payload.transfers); setMessage(payload.transfers.length ? "" : "No hay comprobantes pendientes.");
  }

  async function decide(submissionId: number, decision: "approve" | "reject") {
    setBusy(submissionId);
    const response = await fetch("/api/admin/bank-transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId, decision }) });
    const payload = await readJson(response); setBusy(null);
    setMessage(response.ok ? `Orden #${payload.orderId}: ${decision === "approve" ? "pago aprobado y retenido" : "pago rechazado"}.` : (payload.error ?? "No se pudo actualizar."));
    if (response.ok) await load();
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  return <main className="admin-shell"><header className="storefront-header"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.png" alt="StreamLock" /></Link><span className="secure-label">Panel de revisión · Fondos protegidos</span></header><section className="admin-content"><p className="kicker">OPERACIONES</p><h1>Comprobantes bancarios</h1><p className="admin-lead">Verifica cada transferencia antes de liberar el pedido al vendedor.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{transfers.map(item => <article className="admin-transfer" key={item.submission.id}><div><p className="kicker">ORDEN #{item.order.id}</p><h2>{item.product.title}</h2><p>{item.store.name} · Banco {item.submission.bank}</p><p>Referencia: <b>{item.submission.reference}</b></p><p>Monto: <b>${(item.submission.amountCents / 100).toFixed(2)}</b></p>{item.submission.receiptUrl && <a href={item.submission.receiptUrl.startsWith("r2://") ? `/api/admin/bank-transfers/receipt?submissionId=${item.submission.id}` : item.submission.receiptUrl} target="_blank" rel="noreferrer">Abrir comprobante ↗</a>}</div><div className="admin-actions"><button disabled={busy === item.submission.id} onClick={() => void decide(item.submission.id, "approve")}>Aprobar pago</button><button className="reject" disabled={busy === item.submission.id} onClick={() => void decide(item.submission.id, "reject")}>Rechazar</button></div></article>)}</div></section></main>;
}
