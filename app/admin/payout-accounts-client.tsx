"use client";

import { useEffect, useState } from "react";
import { readJson } from "../../lib/client-json";

type Account = { id: number; ownerId: string; bankName: string; accountType: string; accountHolderName: string; accountNumberLast4: string; status: string; createdAt: string; updatedAt: string };
type RevealedAccount = { accountId: number; bankName: string; accountType: string; accountHolderName: string; accountNumber: string };
const statusLabels: Record<string, string> = { pending_review: "Pendiente", approved: "Aprobada", rejected: "Rechazada" };

export default function AdminPayoutAccountsClient() {
  const [items, setItems] = useState<Account[]>([]);
  const [message, setMessage] = useState("Cargando cuentas de retiro…");
  const [busy, setBusy] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<number, RevealedAccount>>({});

  async function load() {
    const response = await fetch("/api/admin/payout-accounts", { cache: "no-store" });
    const payload = await readJson(response);
    if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar las cuentas de retiro."); return; }
    setItems(payload.accounts ?? []); setMessage(payload.accounts?.length ? "" : "No hay cuentas bancarias de retiro registradas.");
  }

  async function decide(accountId: number, decision: "approve" | "reject") {
    setBusy(accountId);
    const response = await fetch("/api/admin/payout-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, decision }) });
    const payload = await readJson(response); setBusy(null);
    setMessage(response.ok ? `Cuenta ${decision === "approve" ? "aprobada" : "rechazada"}.` : payload.error ?? "No se pudo actualizar la cuenta.");
    if (response.ok) await load();
  }

  async function reveal(accountId: number) {
    const reason = window.prompt("Escribe el motivo operativo. Quedará registrado en la auditoría:");
    if (!reason?.trim()) return;
    setBusy(accountId);
    const response = await fetch("/api/admin/payout-accounts/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, reason }) });
    const payload = await readJson(response); setBusy(null);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo revelar la cuenta."); return; }
    const revealedAccount = payload as unknown as RevealedAccount;
    setRevealed((current) => ({ ...current, [accountId]: revealedAccount }));
    setMessage("Número revelado para esta sesión y registrado en auditoría. No lo compartas fuera del proceso autorizado.");
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  return <section className="admin-content admin-disputes"><p className="kicker">TESORERÍA · DATOS PROTEGIDOS</p><h1>Cuentas bancarias de retiro</h1><p className="admin-lead">Aquí se concentran las cuentas registradas por vendedores. El número completo solo se revela al administrador autorizado mediante una acción explícita, con motivo obligatorio y auditoría.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(account => { const full = revealed[account.id]; return <article className="admin-transfer" key={account.id}><div><p className="kicker">CUENTA #{account.id} · {account.ownerId}</p><h2>{account.bankName} <span className="status-pill">{statusLabels[account.status] ?? account.status}</span></h2><p>{account.accountType} · Titular: <b>{account.accountHolderName}</b></p><p>Número: <b>{full?.accountNumber ?? `****${account.accountNumberLast4}`}</b></p>{full && <p className="admin-sensitive-note">Revelado solo en esta sesión administrativa.</p>}</div><div className="admin-actions">{account.status === "pending_review" && <><button disabled={busy === account.id} onClick={() => void decide(account.id, "approve")}>Aprobar cuenta</button><button className="reject" disabled={busy === account.id} onClick={() => void decide(account.id, "reject")}>Rechazar</button></>}{!full && <button disabled={busy === account.id} onClick={() => void reveal(account.id)}>Mostrar número completo</button>}</div></article>; })}</div></section>;
}
