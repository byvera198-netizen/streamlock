"use client";

import { useEffect, useState } from "react";
import { readJson } from "../../lib/client-json";

type Withdrawal = { id: number; ownerId: string; payoutAccountId: number | null; amountCents: number; method: string; destination: string; transferReference: string | null; status: string; createdAt: string; payoutBankName: string | null; payoutAccountLast4: string | null; payoutAccountStatus: string | null; hasTransferProof: boolean };

export default function AdminWithdrawalsClient() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [message, setMessage] = useState("Cargando solicitudes…");
  const [busy, setBusy] = useState<number | null>(null);
  const [references, setReferences] = useState<Record<number, string>>({});
  const [proofs, setProofs] = useState<Record<number, File | null>>({});

  async function load() { const response = await fetch("/api/admin/withdrawals", { cache: "no-store" }); const payload = await readJson(response); if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar los retiros."); return; } setItems(payload.withdrawals ?? []); setMessage(payload.withdrawals?.length ? "" : "No hay retiros pendientes."); }
  async function decide(id: number, decision: "approve" | "reject") {
    setBusy(id);
    let response: Response;
    if (decision === "approve") { const data = new FormData(); data.append("withdrawalId", String(id)); data.append("decision", decision); data.append("transferReference", references[id] ?? ""); if (proofs[id]) data.append("transferProof", proofs[id] as File); response = await fetch("/api/admin/withdrawals", { method: "POST", body: data }); }
    else response = await fetch("/api/admin/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ withdrawalId: id, decision }) });
    const payload = await readJson(response); setBusy(null); setMessage(response.ok ? `Retiro #${id}: ${decision === "approve" ? `transferencia registrada con referencia ${payload.transferReference}.` : "rechazado y saldo restaurado."}` : payload.error ?? "No se pudo actualizar."); if (response.ok) await load();
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  return <section className="admin-content admin-disputes"><p className="kicker">TESORERÍA</p><h1>Retiros pendientes</h1><p className="admin-lead">Registra la transferencia antes de marcar un retiro como pagado. La referencia es obligatoria; el comprobante es opcional y queda privado en R2.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(item => <article className="admin-transfer" key={item.id}><div><p className="kicker">RETIRO #{item.id}</p><h2>${(item.amountCents / 100).toFixed(2)}</h2><p>Vendedor: {item.ownerId}</p><p>Método: <b>{item.method}</b></p>{item.payoutAccountId ? <p>Cuenta aprobada: <b>{item.payoutBankName} · ****{item.payoutAccountLast4}</b> · <a href="#payout-reviews">Ver cuenta bancaria</a></p> : <p>Destino manual: <b>{item.destination}</b></p>}</div><div className="admin-actions"><label className="admin-input-label">Referencia bancaria<input value={references[item.id] ?? ""} onChange={event => setReferences({ ...references, [item.id]: event.target.value })} placeholder="TRX-2026-0001" /></label><label className="admin-input-label">Comprobante opcional<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => setProofs({ ...proofs, [item.id]: event.target.files?.[0] ?? null })} /></label><button disabled={busy === item.id || (references[item.id] ?? "").trim().length < 3} onClick={() => void decide(item.id, "approve")}>Registrar transferencia</button><button className="reject" disabled={busy === item.id} onClick={() => void decide(item.id, "reject")}>Rechazar y devolver saldo</button></div></article>)}</div></section>;
}
