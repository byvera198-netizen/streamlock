"use client";

import { FormEvent, useEffect, useState } from "react";

type BankAccount = { id: number; slug: string; bankName: string; accountType: string; accountNumber: string; active: boolean };

export default function AdminBankAccountsClient() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState({ slug: "", bankName: "", accountType: "Cuenta de ahorro", accountNumber: "" });
  const [message, setMessage] = useState("Cargando cuentas…");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/admin/bank-accounts");
    const payload = await response.json() as { error?: string; accounts?: BankAccount[] };
    if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar las cuentas."); return; }
    setAccounts(payload.accounts ?? []); setMessage("");
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("Guardando cuenta…");
    const response = await fetch("/api/admin/bank-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json() as { error?: string; account?: BankAccount };
    if (!response.ok) { setMessage(payload.error ?? "No se pudo crear la cuenta."); return; }
    setForm({ slug: "", bankName: "", accountType: "Cuenta de ahorro", accountNumber: "" }); setMessage("Cuenta agregada."); await load();
  }

  async function toggle(account: BankAccount) {
    setBusy(account.id);
    const response = await fetch("/api/admin/bank-accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: account.id, active: !account.active }) });
    const payload = await response.json() as { error?: string }; setBusy(null);
    setMessage(response.ok ? `Cuenta ${account.active ? "desactivada" : "activada"}.` : payload.error ?? "No se pudo actualizar la cuenta.");
    if (response.ok) await load();
  }

  return <section className="admin-content"><p className="kicker">CONFIGURACIÓN · COBROS</p><h1>Cuentas para transferencias</h1><p className="admin-lead">Las cuentas activas aparecen en el checkout. Desactiva una cuenta sin borrarla para conservar el historial.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{accounts.map(account => <article className="admin-transfer" key={account.id}><div><p className="kicker">{account.slug}</p><h2>{account.bankName}</h2><p>{account.accountType} · <b>{account.accountNumber}</b></p></div><div className="admin-actions"><span>{account.active ? "Activa" : "Inactiva"}</span><button className={account.active ? "reject" : ""} disabled={busy === account.id} onClick={() => void toggle(account)}>{account.active ? "Desactivar" : "Activar"}</button></div></article>)}</div><form className="store-form" onSubmit={add}><h2>Agregar cuenta</h2><div className="field-row"><label>Identificador<input value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} placeholder="ej. produbanco" required /></label><label>Banco<input value={form.bankName} onChange={event => setForm({ ...form, bankName: event.target.value })} placeholder="Banco del Pacífico" required /></label></div><div className="field-row"><label>Tipo de cuenta<input value={form.accountType} onChange={event => setForm({ ...form, accountType: event.target.value })} required /></label><label>Número de cuenta<input value={form.accountNumber} onChange={event => setForm({ ...form, accountNumber: event.target.value })} required /></label></div><button>Agregar cuenta →</button></form></section>;
}
