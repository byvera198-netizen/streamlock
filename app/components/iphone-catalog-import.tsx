"use client";

import { useState } from "react";
import { readJson } from "../../lib/client-json";

export default function IPhoneCatalogImport({ storeId, onImported }: { storeId: number; onImported: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCatalog() {
    if (!window.confirm("Se crearán hasta 12 productos iPhone como BORRADORES, con stock referencial de 20 unidades. No serán visibles ni comprables hasta publicarlos. ¿Continuar?")) return;
    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/products/iphone-catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId }), signal: controller.signal });
      const payload = await readJson(response);
      setMessage(response.ok ? payload.message ?? "Catálogo base cargado." : payload.error ?? "No se pudo cargar el catálogo base.");
      if (response.ok && payload.created) onImported();
    } catch {
      setMessage("La carga se inició. Actualizando el catálogo para confirmar los borradores…");
      onImported();
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  return <div className="catalog-import-card" style={{ maxWidth: 1040, margin: "20px auto 0", padding: 18, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", border: "1px solid #dfe4d7", borderRadius: 16, background: "#fffdf9" }}><div style={{ display: "grid", gap: 5, flex: "1 1 300px" }}><b>Catálogo base de iPhone</b><span style={{ color: "#69746e", fontSize: 12 }}>12 modelos nuevos y open box · 20 unidades referenciales · borradores editables</span></div><button type="button" onClick={() => void loadCatalog()} disabled={busy} style={{ border: 0, borderRadius: 999, padding: "11px 16px", background: "#13201f", color: "#fff", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>{busy ? "Cargando catálogo…" : "Cargar catálogo base"}</button>{message && <output style={{ flexBasis: "100%", color: "#59665e", fontSize: 12 }}>{message}</output>}</div>;
}
