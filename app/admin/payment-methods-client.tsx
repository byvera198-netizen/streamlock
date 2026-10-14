"use client";

import { useEffect, useState } from "react";

type Method = { id: string; label: string; status: string; automated: boolean; note: string };

const statusLabels: Record<string, string> = {
  active: "Activo",
  manual_review: "Revisión manual",
  not_configured: "No configurado",
  sandbox_ready: "Listo para sandbox",
};

export default function AdminPaymentMethodsClient() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [message, setMessage] = useState("Cargando métodos de pago…");

  useEffect(() => {
    void fetch("/api/admin/payment-methods").then(async (response) => {
      const payload = await response.json() as { methods?: Method[]; error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo cargar el estado de pagos.");
        return;
      }
      setMethods(payload.methods ?? []);
      setMessage("");
    }).catch(() => setMessage("No se pudo cargar el estado de pagos."));
  }, []);

  return <section className="admin-content"><p className="kicker">PAGOS · CONFIGURACIÓN SEGURA</p><h1>Métodos de pago</h1><p className="admin-lead">La transferencia bancaria sigue activa sin costo. Los métodos automáticos permanecen apagados hasta conectar y probar un proveedor.</p>{message && <div className="admin-message">{message}</div>}<div className="admin-list">{methods.map(method => <article className="admin-transfer" key={method.id}><div><p className="kicker">{method.id}</p><h2>{method.label}</h2><p>{method.note}</p></div><div className="admin-actions"><span>{statusLabels[method.status] ?? method.status}</span><span>{method.automated ? "Automático" : "No automático"}</span></div></article>)}</div></section>;
}
