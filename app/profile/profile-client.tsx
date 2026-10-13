"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { readJson } from "../../lib/client-json";

type Profile = { legalName: string; idLast4: string; phone: string; phoneVerifiedAt: string | null; address: string; status: string; updatedAt: string };

const statusLabels: Record<string, string> = { pending_review: "Pendiente de revisión", approved: "Aprobado", rejected: "Requiere actualización" };

export default function ProfileClient({ signInHref }: { signInHref: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ legalName: "", idNumber: "", phone: "", address: "" });
  const [message, setMessage] = useState("Cargando tu perfil…");
  const [busy, setBusy] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);

  useEffect(() => { void fetch("/api/profile").then(async (response) => { const payload = await readJson(response); if (!response.ok) { setMessage(payload.error ?? "No se pudo cargar el perfil."); return; } if (payload.profile) { setProfile(payload.profile); setForm({ legalName: payload.profile.legalName, idNumber: "", phone: payload.profile.phone, address: payload.profile.address }); setMessage(""); } else setMessage("Completa tus datos para activar compras protegidas."); }); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await readJson(response); setBusy(false);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo guardar el perfil."); return; }
    setProfile(payload.profile); setForm((current) => ({ ...current, idNumber: "" })); setMessage(payload.message);
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

  return <main className="checkout-shell"><header className="storefront-header"><Link href="/" prefetch={false} className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></Link><Link href="/my-orders" prefetch={false} className="secure-label">Mis compras</Link></header><section className="profile-card"><p className="kicker">IDENTIDAD · PRIVACIDAD</p><h1>Tu perfil protegido.</h1><p className="checkout-muted">Necesitamos estos datos para crear pedidos seguros. La identificación se guarda como huella criptográfica y solo conservamos sus últimos cuatro caracteres.</p>{profile && <div className="profile-status">Estado: <b>{statusLabels[profile.status] ?? profile.status}</b> · ID terminada en {profile.idLast4}</div>}<form className="checkout-form" onSubmit={save}><label>Nombre legal completo<input value={form.legalName} onChange={event => setForm({ ...form, legalName: event.target.value })} minLength={5} required /></label><label>Número de identificación / cédula<input value={form.idNumber} onChange={event => setForm({ ...form, idNumber: event.target.value })} placeholder={profile ? "Déjalo vacío para conservarla" : "Solo números y letras"} minLength={6} required={!profile} /></label><label>Teléfono validado<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="+593 98 528 0991" required /></label><label>Dirección física de despacho<textarea value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} minLength={10} required /></label><button disabled={busy}>{busy ? "Guardando…" : "Guardar perfil protegido →"}</button>{message && <output>{message}</output>}</form>{profile && <div className="phone-verification"><p><b>Verificación de WhatsApp:</b> {profile.phoneVerifiedAt ? "Confirmado" : "Pendiente"}</p>{!profile.phoneVerifiedAt && <><button type="button" onClick={() => void requestPhoneCode()} disabled={verificationBusy}>Enviar código por WhatsApp</button><form onSubmit={verifyPhoneCode}><input inputMode="numeric" maxLength={6} value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Código de 6 dígitos" /><button disabled={verificationBusy || verificationCode.length !== 6}>Confirmar código</button></form></>}{verificationMessage && <output>{verificationMessage}</output>}</div>}{message.startsWith("Inicia sesión") && <a className="profile-required-link" href={signInHref} target="_top" rel="noreferrer">Iniciar sesión para completar el perfil →</a>}<small>Tu dirección y teléfono permanecen ocultos al vendedor hasta que el pago sea confirmado.</small></section></main>;
}
