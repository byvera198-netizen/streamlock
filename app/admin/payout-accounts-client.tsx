"use client";

import { useEffect, useState } from "react";
import { readJson } from "../../lib/client-json";

type Account = { id: number; ownerId: string; bankName: string; accountType: string; accountHolderName: string; accountNumberLast4: string; status: string; createdAt: string; updatedAt: string };

export default function AdminPayoutAccountsClient() {
  const [items, setItems] = useState<Account[]>([]);
  const [message, setMessage] = useState("Cargando cuentas de retiro…");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/admin/payout-accounts");
    const payload = await readJson(response);
    if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar las cuentas de retiro."); return; }
    setItems(payload.accounts ?? []); setMessage(payload.accounts?.length ? "" : "No hay cuentas de retiro pendientes.");
  }

  async function decide(accountId: number, decision: "approve" | "reject") {
    setBusy(accountId);
    const response = await fetch("/api/admin/payout-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, decision }) });
    const payload = await readJson(response); setBusy(null);
    setMessage(response.ok ? `Cuenta ${decision === "approve" ? "aprobada" : "rechazada"}.` : payload.error ?? "No se pudo actualizar la cuenta.");
    if (response.ok) await load();
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  return <section className="admin-content admin-disputes"><p className="kicker">TESORERÍA · DATOS PROTEGIDOS</p><h1>Cuentas de retiro por revisar</h1><p className="admin-lead">Aprueba la cuenta bancaria del vendedor antes de utilizarla para retiros. El número completo no se muestra en este panel.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(account => <article className="admin-transfer" key={account.id}><div><p className="kicker">CUENTA #{account.id} · {account.ownerId}</p><h2>{account.bankName}</h2><p>{account.accountType} · Titular: <b>{account.accountHolderName}</b></p><p>Número terminado en <b>****{account.accountNumberLast4}</b></p></div><div className="admin-actions"><button disabled={busy === account.id} onClick={() => void decide(account.id, "approve")}>Aprobar cuenta</button><button className="reject" disabled={busy === account.id} onClick={() => void decide(account.id, "reject")}>Rechazar</button></div></article>)}</div></section>;
}
