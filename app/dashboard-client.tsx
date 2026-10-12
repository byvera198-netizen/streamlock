"use client";

import { FormEvent, useState } from "react";

type Store = { id: number; name: string; slug: string; socialNetwork: string; status: string };

export default function DashboardClient() {
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [network, setNetwork] = useState("Instagram");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const response = await fetch("/api/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, socialNetwork: network }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo crear el negocio."); return; }
    setStore(payload.store); setMessage("Tu negocio fue creado. El siguiente paso es completar la verificación.");
  }

  return <main className="dashboard-shell">
    <nav className="dashboard-nav"><a href="/" className="brand-logo"><img src="/streamlock-logo.jpg" alt="StreamLock" /></a><span>Centro de negocios</span><button>Mi cuenta</button></nav>
    <section className="dashboard-hero"><div><p className="kicker">PRIMER PASO · NEGOCIO VERIFICADO</p><h1>Abre tu vitrina<br /><em>con respaldo.</em></h1><p className="lead">Crea el perfil público de tu negocio. Luego agregaremos productos, inventario y el checkout protegido.</p></div><div className="trust-card"><span>01</span><b>Datos del negocio</b><small>Necesarios para iniciar la verificación.</small><div className="progress"><i /></div><p>1 de 4 pasos</p></div></section>
    <section className="onboarding-grid"><form onSubmit={createStore} className="store-form"><h2>Cuéntanos sobre tu negocio</h2><p>Este nombre aparecerá en tu vitrina y enlaces de venta.</p><label>Nombre comercial<input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Casa Morena" required minLength={3} /></label><label>Red social principal<select value={network} onChange={e => setNetwork(e.target.value)}><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>WhatsApp</option></select></label><button disabled={loading}>{loading ? "Creando…" : "Crear mi vitrina →"}</button>{message && <output>{message}</output>}</form>
      <aside className="preview-card"><p className="kicker">VISTA PREVIA</p><div className="store-preview"><div className="preview-cover" /><div className="preview-avatar">{name ? name.slice(0,2).toUpperCase() : "TU"}</div><h3>{name || "Tu negocio"} <span>✓</span></h3><p>{network} · Pendiente de verificación</p><div className="preview-line" /><div className="preview-line short" /></div>{store && <div className="created-store"><b>/{store.slug}</b><span>Vitrina creada</span></div>}</aside>
    </section>
  </main>;
}
