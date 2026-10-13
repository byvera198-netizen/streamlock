"use client";

import { useEffect, useState } from "react";
import { readJson } from "../../lib/client-json";

type Store = { id: number; ownerId: string; name: string; slug: string; socialNetwork: string; status: string; profileStatus: string };

export default function AdminStoresClient() {
  const [items, setItems] = useState<Store[]>([]);
  const [message, setMessage] = useState("Cargando vitrinas…");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/admin/stores");
    const payload = await readJson(response);
    if (!response.ok) { setMessage(payload.error ?? "No se pudieron cargar las vitrinas."); return; }
    setItems(payload.stores ?? []);
    setMessage(payload.stores?.length ? "" : "No hay vitrinas pendientes de revisión.");
  }

  async function decide(storeId: number, decision: "approve" | "reject") {
    setBusy(storeId);
    const response = await fetch("/api/admin/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId, decision }) });
    const payload = await readJson(response);
    setBusy(null);
    setMessage(response.ok ? `Vitrina ${decision === "approve" ? "verificada" : "rechazada"}.` : payload.error ?? "No se pudo actualizar la vitrina.");
    if (response.ok) await load();
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  return <section className="admin-content admin-disputes"><p className="kicker">NEGOCIOS Y CONFIANZA</p><h1>Vitrinas por revisar</h1><p className="admin-lead">Aprueba la vitrina solo después de confirmar que el perfil KYC del propietario ya fue aprobado.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{items.map(store => <article className="admin-transfer" key={store.id}><div><p className="kicker">NEGOCIO #{store.id} · {store.ownerId}</p><h2>{store.name}</h2><p>/{store.slug} · {store.socialNetwork}</p><p>Estado de identidad: <b>{store.profileStatus === "approved" ? "Aprobado" : store.profileStatus === "pending_review" ? "Pendiente" : store.profileStatus === "rejected" ? "Rechazado" : "Sin perfil"}</b></p></div><div className="admin-actions"><button disabled={busy === store.id || store.profileStatus !== "approved"} onClick={() => void decide(store.id, "approve")}>Verificar vitrina</button><button className="reject" disabled={busy === store.id} onClick={() => void decide(store.id, "reject")}>Rechazar</button></div></article>)}</div></section>;
}
