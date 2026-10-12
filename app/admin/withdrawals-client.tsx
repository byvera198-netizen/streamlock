"use client";

import { useEffect, useState } from "react";

type Withdrawal = { id: number; ownerId: string; amountCents: number; method: string; destination: string; status: string; createdAt: string };

export default function AdminWithdrawalsClient() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [message, setMessage] = useState("Cargando solicitudes…");
  const [busy, setBusy] = useState<number | null>(null);
  async function load() { const response = await fetch("/api/admin/withdrawals"); const payload = await response.json(); if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar los retiros."); return; } setItems(payload.withdrawals ?? []); setMessage(payload.withdrawals?.length ? "" : "No hay retiros pendientes."); }
  async function decide(id: number, decision: "approve" | "reject") { setBusy(id); const response = await fetch("/api/admin/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ withdrawalId: id, decision }) }); const payload = await response.json(); setBusy(null); setMessage(response.ok ? `Retiro #${id}: ${decision === "approve" ? "marcado como pagado" : "rechazado y saldo restaurado"}.` : payload.error ?? "No se pudo actualizar."); if (response.ok) await load(); }
  useEffect(() => { void load(); }, []);
  return <section className="admin-content admin-disputes"><p className="kicker">TESORERÍA</p><h1>Retiros pendientes</h1><p className="admin-lead">Revisa cada solicitud antes de realizar la transferencia al vendedor.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(item => <article className="admin-transfer" key={item.id}><div><p className="kicker">RETIRO #{item.id}</p><h2>${(item.amountCents / 100).toFixed(2)}</h2><p>Vendedor: {item.ownerId}</p><p>Método: <b>{item.method}</b></p><p>Destino: <b>{item.destination}</b></p></div><div className="admin-actions"><button disabled={busy === item.id} onClick={() => void decide(item.id, "approve")}>Marcar pagado</button><button className="reject" disabled={busy === item.id} onClick={() => void decide(item.id, "reject")}>Rechazar y devolver saldo</button></div></article>)}</div></section>;
}
