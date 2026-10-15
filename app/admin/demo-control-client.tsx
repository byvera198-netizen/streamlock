"use client";

import { useEffect, useState } from "react";

type DemoRun = { id: string; label: string; createdAt: string; deletedAt: string | null; recordCount: number };

export default function AdminDemoControl() {
  const [runs, setRuns] = useState<DemoRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRuns() {
    const response = await fetch("/api/admin/demo", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { runs?: DemoRun[] };
    setRuns(data.runs ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRuns(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createDemo() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/demo", { method: "POST" });
    const data = await response.json() as { message?: string; error?: string };
    setMessage(data.message ?? data.error ?? "No se pudo crear el lote DEMO.");
    if (response.ok) await loadRuns();
    setBusy(false);
  }

  async function removeDemo(runId: string) {
    if (!window.confirm(`¿Eliminar el lote ${runId}? Solo se borrarán datos DEMO.`)) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/demo?runId=${encodeURIComponent(runId)}`, { method: "DELETE" });
    const data = await response.json() as { message?: string; error?: string };
    setMessage(data.message ?? data.error ?? "No se pudo eliminar el lote DEMO.");
    if (response.ok) await loadRuns();
    setBusy(false);
  }

  return <section className="admin-content admin-demo" id="demo-data"><p className="kicker">ENTORNO CONTROLADO</p><h1>Datos DEMO</h1><p className="admin-lead">Crea un escenario completo de prueba para revisar vitrina, productos, orden, comprobante, entrega y notificaciones. Todo queda marcado como DEMO y se puede eliminar por lote.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-security-banner"><b>Sin datos reales</b><span>No se crean documentos, cuentas bancarias, credenciales ni movimientos de dinero. Los compradores y vendedores DEMO son identidades sintéticas.</span></div><div className="admin-actions demo-create-actions"><button type="button" disabled={busy} onClick={() => void createDemo()}>{busy ? "Procesando…" : "Crear lote DEMO completo"}</button></div><div className="admin-list">{runs.length === 0 ? <div className="admin-transfer"><p>No hay lotes DEMO creados todavía.</p></div> : runs.map(run => <article className="admin-transfer" key={run.id}><div><p className="kicker">LOTE DE PRUEBA</p><h2>{run.id}</h2><p>{run.label} · {run.recordCount} registros · {new Date(run.createdAt).toLocaleString()}</p>{run.deletedAt && <p>Eliminado el {new Date(run.deletedAt).toLocaleString()}</p>}</div><div className="admin-actions"><button type="button" disabled={busy || Boolean(run.deletedAt)} onClick={() => void removeDemo(run.id)}>Eliminar lote</button></div></article>)}</div></section>;
}
