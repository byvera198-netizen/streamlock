"use client";

import { useEffect, useState } from "react";

type Profile = { userId: string; legalName: string; idLast4: string; phone: string; address: string; status: string; updatedAt: string };

export default function AdminProfilesClient() {
  const [items, setItems] = useState<Profile[]>([]);
  const [message, setMessage] = useState("Cargando perfiles…");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/profiles");
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar los perfiles."); return; }
    setItems(payload.profiles ?? []); setMessage(payload.profiles?.length ? "" : "No hay perfiles pendientes de revisión.");
  }

  async function decide(userId: string, decision: "approve" | "reject") {
    setBusy(userId);
    const response = await fetch("/api/admin/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, decision }) });
    const payload = await response.json(); setBusy(null);
    setMessage(response.ok ? `Perfil ${decision === "approve" ? "aprobado" : "rechazado"}.` : payload.error ?? "No se pudo actualizar el perfil.");
    if (response.ok) await load();
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  return <section className="admin-content admin-disputes"><p className="kicker">IDENTIDAD Y CONFIANZA</p><h1>Perfiles por revisar</h1><p className="admin-lead">Confirma los datos básicos antes de permitir operaciones sensibles. La identificación completa no se muestra ni se almacena en StreamLock.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(profile => <article className="admin-transfer profile-review" key={profile.userId}><div><p className="kicker">USUARIO · {profile.userId}</p><h2>{profile.legalName}</h2><p>Identificación terminada en <b>****{profile.idLast4}</b> · Actualizado {new Date(profile.updatedAt).toLocaleString()}</p><p>Teléfono: <b>{profile.phone}</b></p><p>Dirección: <b>{profile.address}</b></p></div><div className="admin-actions"><button disabled={busy === profile.userId} onClick={() => void decide(profile.userId, "approve")}>Aprobar perfil</button><button className="reject" disabled={busy === profile.userId} onClick={() => void decide(profile.userId, "reject")}>Rechazar</button></div></article>)}</div></section>;
}
