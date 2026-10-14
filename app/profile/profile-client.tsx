"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { readJson } from "../../lib/client-json";

type Profile = { legalName: string; idLast4: string; phone: string; phoneVerifiedAt: string | null; address: string; identityDocumentType: string | null; identityDocumentSubmittedAt: string | null; hasIdentityDocument: boolean; status: string; updatedAt: string };
type PayoutAccount = { id: number; bankName: string; accountType: string; accountHolderName: string; accountNumberLast4: string; status: string; createdAt: string; updatedAt: string };

const statusLabels: Record<string, string> = { pending_review: "Pendiente de revisión", approved: "Aprobado", rejected: "Requiere actualización" };
const payoutStatusLabels: Record<string, string> = { pending_review: "Pendiente de revisión", approved: "Aprobada", rejected: "Rechazada" };

export default function ProfileClient({ signInHref }: { signInHref: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ legalName: "", idNumber: "", phone: "", address: "" });
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [message, setMessage] = useState("Cargando tu perfil…");
  const [busy, setBusy] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [payoutForm, setPayoutForm] = useState({ bankName: "", accountType: "Cuenta de ahorros", accountHolderName: "", accountNumber: "" });
  const [payoutMessage, setPayoutMessage] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/profile").then(async (response) => {
      const payload = await readJson(response);
      if (!response.ok) { setMessage(payload.error ?? "No se pudo cargar el perfil."); return; }
      if (payload.profile) {
        setProfile(payload.profile);
        setForm({ legalName: payload.profile.legalName, idNumber: "", phone: payload.profile.phone, address: payload.profile.address });
        setMessage("");
        const accountResponse = await fetch("/api/profile/payout-account");
        const accountPayload = await readJson(accountResponse);
        if (accountResponse.ok) setPayoutAccounts(accountPayload.accounts ?? []);
      } else setMessage("Completa tus datos para activar compras protegidas.");
    });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData();
    data.append("legalName", form.legalName);
    data.append("idNumber", form.idNumber);
    data.append("phone", form.phone);
    data.append("address", form.address);
    if (identityDocument) data.append("identityDocument", identityDocument);
    const response = await fetch("/api/profile", { method: "POST", body: data });
    const payload = await readJson(response); setBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo guardar el perfil."); return; }
    setProfile(payload.profile); setIdentityDocument(null); setForm((current) => ({ ...current, idNumber: "" })); setMessage(payload.message);
  }

  async function requestPhoneCode() {
    setVerificationBusy(true); setVerificationMessage("");
    const response = await fetch("/api/profile/phone-verification/start", { method: "POST" });
    const payload = await readJson(response); setVerificationBusy(false); setVerificationMessage(payload.message ?? payload.error ?? "No se pudo enviar el código.");
  }

  async function verifyPhoneCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setVerificationBusy(true); setVerificationMessage("");
    const response = await fetch("/api/profile/phone-verification/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: verificationCode }) });
    const payload = await readJson(response); setVerificationBusy(false); setVerificationMessage(payload.message ?? payload.error ?? "No se pudo verificar el código.");
    if (response.ok && profile) setProfile({ ...profile, phoneVerifiedAt: new Date().toISOString() });
  }

  async function savePayoutAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPayoutBusy(true); setPayoutMessage("");
    const response = await fetch("/api/profile/payout-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payoutForm) });
    const payload = await readJson(response); setPayoutBusy(false);
    setPayoutMessage(payload.message ?? payload.error ?? "No se pudo registrar la cuenta.");
    if (response.ok) { setPayoutAccounts((current) => [payload.account, ...current]); setPayoutForm({ bankName: "", accountType: "Cuenta de ahorros", accountHolderName: "", accountNumber: "" }); }
  }

  return <main className="checkout-shell"><header className="storefront-header"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><Link href="/my-orders" prefetch={false} className="secure-label">Mis compras</Link></header><section className="profile-card"><p className="kicker">IDENTIDAD · PRIVACIDAD</p><h1>Tu perfil protegido.</h1><p className="checkout-muted">Necesitamos estos datos para crear pedidos seguros. La identificación se guarda como huella criptográfica y solo conservamos sus últimos cuatro caracteres.</p>{profile && <div className="profile-status">Estado: <b>{statusLabels[profile.status] ?? profile.status}</b> · ID terminada en {profile.idLast4}</div>}<form className="checkout-form" onSubmit={save}><label>Nombre legal completo<input value={form.legalName} onChange={event => setForm({ ...form, legalName: event.target.value })} minLength={5} required /></label><label>Número de identificación / cédula<input value={form.idNumber} onChange={event => setForm({ ...form, idNumber: event.target.value })} placeholder={profile ? "Déjalo vacío para conservarla" : "Solo números y letras"} minLength={6} required={!profile} /></label><label>Teléfono de contacto<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="+593 98 528 0991" required /></label><label>Dirección física de despacho<textarea value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} minLength={10} required /></label><label>Documento de identidad<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required={!profile?.hasIdentityDocument} onChange={event => setIdentityDocument(event.target.files?.[0] ?? null)} /><small>Cédula o documento oficial · PDF/JPG/PNG/WebP · máximo 5 MB. {profile?.hasIdentityDocument ? "Ya existe un documento enviado; adjunta otro solo si deseas reemplazarlo." : "Es obligatorio para enviar tu perfil a revisión."}</small></label><button disabled={busy}>{busy ? "Guardando…" : "Guardar perfil protegido →"}</button>{message && <output>{message}</output>}</form>{profile && <><div className="phone-verification"><p><b>Verificación telefónica:</b> {profile.phoneVerifiedAt ? "Confirmada" : "Pendiente (opcional)"}</p>{!profile.phoneVerifiedAt && <><p className="checkout-muted">Puedes comprar y usar el checkout bancario aunque la plantilla OTP de WhatsApp todavía esté pendiente en Meta.</p><button type="button" onClick={() => void requestPhoneCode()} disabled={verificationBusy}>Intentar verificación por WhatsApp</button><form onSubmit={verifyPhoneCode}><input inputMode="numeric" maxLength={6} value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Código de 6 dígitos" /><button disabled={verificationBusy || verificationCode.length !== 6}>Confirmar código</button></form></>}{verificationMessage && <output>{verificationMessage}</output>}</div><div className="payout-card"><p className="kicker">RETIROS · OPCIONAL</p><h2>Cuenta para recibir tus ventas</h2><p className="checkout-muted">Es distinta de las cuentas de StreamLock para depósitos. El número completo se cifra y nunca se muestra; administración solo ve el banco, titular y últimos cuatro dígitos.</p>{payoutAccounts.map(account => <div className="payout-account" key={account.id}><b>{account.bankName}</b><span>{account.accountType} · {account.accountHolderName}</span><small>Cuenta terminada en ****{account.accountNumberLast4} · {payoutStatusLabels[account.status] ?? account.status}</small></div>)}<form className="checkout-form" onSubmit={savePayoutAccount}><label>Banco<input value={payoutForm.bankName} onChange={event => setPayoutForm({ ...payoutForm, bankName: event.target.value })} placeholder="Banco Guayaquil" required /></label><label>Tipo de cuenta<select value={payoutForm.accountType} onChange={event => setPayoutForm({ ...payoutForm, accountType: event.target.value })}><option>Cuenta de ahorros</option><option>Cuenta corriente</option></select></label><label>Titular de la cuenta<input value={payoutForm.accountHolderName} onChange={event => setPayoutForm({ ...payoutForm, accountHolderName: event.target.value })} required /></label><label>Número de cuenta<input value={payoutForm.accountNumber} onChange={event => setPayoutForm({ ...payoutForm, accountNumber: event.target.value })} inputMode="numeric" minLength={6} maxLength={40} required /></label><button disabled={payoutBusy}>{payoutBusy ? "Protegiendo…" : "Registrar cuenta de retiro →"}</button>{payoutMessage && <output>{payoutMessage}</output>}</form></div></>}{message.startsWith("Inicia sesión") && <a className="profile-required-link" href={signInHref} target="_top" rel="noreferrer">Iniciar sesión para completar el perfil →</a>}<small>Tu dirección y teléfono permanecen ocultos al vendedor hasta que el pago sea confirmado.</small></section></main>;
}
