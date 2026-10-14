"use client";

import { useEffect, useState } from "react";
import { readJson } from "../../lib/client-json";

type Withdrawal = {
  id: number;
  ownerId: string;
  payoutAccountId: number | null;
  amountCents: number;
  method: string;
  destination: string;
  transferReference: string | null;
  hasTransferProof: boolean;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
  payoutBankName: string | null;
  payoutAccountLast4: string | null;
};

type Audit = {
  id: number;
  actorId: string;
  targetId: string | null;
  decision: string | null;
  transferReference: string | null;
  hasTransferProof: boolean;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  pending_review: "Pendiente",
  paid: "Pagado",
  rejected: "Rechazado",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("es-EC") : "—";
}

export default function AdminWithdrawalHistoryClient() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [message, setMessage] = useState("Cargando historial…");

  async function load() {
    const response = await fetch("/api/admin/withdrawals/history", { cache: "no-store" });
    const payload = await readJson(response);
    if (!response.ok) {
      setMessage(payload.error ?? "No se pudo cargar el historial.");
      return;
    }
    setItems(payload.withdrawals ?? []);
    setAudit(payload.audit ?? []);
    setMessage("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <section className="admin-content admin-disputes admin-withdrawal-history">
    <p className="kicker">TRAZABILIDAD · TESORERÍA</p>
    <h1>Historial de pagos</h1>
    <p className="admin-lead">Consulta retiros pendientes, pagados o rechazados. Los comprobantes se mantienen privados y solo se abren desde esta sesión administrativa.</p>
    {message && <div className="admin-message">{message}</div>}
    <div className="admin-list">
      {items.map((item) => <article className="admin-transfer admin-history-card" key={item.id}>
        <div>
          <p className="kicker">RETIRO #{item.id} · {formatDate(item.createdAt)}</p>
          <h2>${(item.amountCents / 100).toFixed(2)} <span className={`status-pill status-${item.status}`}>{statusLabels[item.status] ?? item.status}</span></h2>
          <p>Vendedor: <b>{item.ownerId}</b> · Método: <b>{item.method}</b></p>
          <p>{item.payoutAccountId ? <>Cuenta: <b>{item.payoutBankName} · ****{item.payoutAccountLast4}</b></> : <>Destino manual: <b>{item.destination}</b></>}</p>
          <p>Procesado: <b>{formatDate(item.reviewedAt)}</b>{item.transferReference ? <> · Referencia: <b>{item.transferReference}</b></> : ""}</p>
        </div>
        <div className="admin-history-meta">
          {item.hasTransferProof ? <a className="admin-history-link" href={`/api/admin/withdrawals/proof?withdrawalId=${item.id}`} target="_blank" rel="noreferrer">Abrir comprobante ↗</a> : <span>Sin comprobante adjunto</span>}
        </div>
      </article>)}
    </div>
    <div className="admin-history-audit">
      <h2>Auditoría de decisiones</h2>
      {audit.length ? <div className="admin-audit-list">{audit.map((entry) => <article className="admin-audit-row" key={entry.id}><div><b>{entry.decision === "approve" ? "Transferencia registrada" : "Retiro rechazado"}</b><span>Retiro #{entry.targetId ?? "—"} · Administrador {entry.actorId}</span></div><div><span>{formatDate(entry.createdAt)}</span>{entry.transferReference && <span>Ref. {entry.transferReference}</span>}{entry.hasTransferProof && <span>Comprobante privado</span>}</div></article>)}</div> : <div className="admin-message">Todavía no hay decisiones de retiro auditadas.</div>}
    </div>
  </section>;
}
