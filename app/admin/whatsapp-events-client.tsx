"use client";

import { useEffect, useState } from "react";
import { readJson } from "../../lib/client-json";

type WhatsAppStatus = {
  configured: boolean;
  otpConfigured: boolean;
  eventStoreReady: boolean;
  eventCount: number;
  lastReceivedAt: string | null;
  phoneNumberIdLast4: string | null;
  missing: string[];
};

export default function AdminWhatsAppEventsClient() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [message, setMessage] = useState("Cargando estado de WhatsApp…");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/whatsapp-events");
    const payload = await readJson(response);
    if (!response.ok) {
      setMessage(payload.error ?? "No se pudo cargar el estado de WhatsApp.");
      return;
    }
    setStatus({
      configured: payload.configured === true,
      otpConfigured: payload.otpConfigured === true,
      eventStoreReady: payload.eventStoreReady === true,
      eventCount: typeof payload.eventCount === "number" ? payload.eventCount : 0,
      lastReceivedAt: typeof payload.lastReceivedAt === "string" ? payload.lastReceivedAt : null,
      phoneNumberIdLast4: typeof payload.phoneNumberIdLast4 === "string" ? payload.phoneNumberIdLast4 : null,
      missing: Array.isArray(payload.missing) ? payload.missing.filter((item: unknown): item is string => typeof item === "string") : [],
    });
    setMessage("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function sendEmailTest() {
    setEmailBusy(true);
    setEmailMessage("");
    const response = await fetch("/api/admin/email-test", { method: "POST" });
    const payload = await readJson(response);
    setEmailMessage(response.ok ? payload.message ?? "Correo enviado." : payload.error ?? "No se pudo enviar el correo.");
    setEmailBusy(false);
  }

  return <section className="admin-content admin-disputes">
    <p className="kicker">INTEGRACIONES · WHATSAPP</p>
    <h1>Estado del webhook</h1>
    <p className="admin-lead">Supervisa la conexión con Meta sin mostrar tokens, secretos ni datos de conversaciones.</p>
    {message && <div className="admin-message">{message}</div>}
    {status && <div className="admin-list">
      <article className="admin-transfer">
        <div>
          <p className="kicker">SEGURIDAD</p>
          <h2>{status.configured ? "Webhook protegido" : "Configuración incompleta"}</h2>
          <p>Firma HMAC y token de verificación: <b>{status.configured ? "Activos" : "Revisar variables"}</b></p>
          <p>Plantilla OTP de Meta: <b>{status.otpConfigured ? "Lista" : "Pendiente de configuración/aprobación"}</b></p>
          {status.missing.length > 0 && <p>Variables pendientes: <b>{status.missing.join(", ")}</b></p>}
          <p>El checkout bancario y las notificaciones dentro de StreamLock no dependen de esta integración.</p>
        </div>
        <div className="admin-actions"><button onClick={() => void load()}>Actualizar estado</button></div>
      </article>
      <article className="admin-transfer">
        <div>
          <p className="kicker">EVENTOS RECIBIDOS</p>
          <h2>{status.eventCount}</h2>
          <p>Almacenamiento idempotente: <b>{status.eventStoreReady ? "Activo" : "Esperando primer evento"}</b></p>
          <p>Último evento: <b>{status.lastReceivedAt ? new Date(status.lastReceivedAt).toLocaleString() : "—"}</b></p>
        </div>
        <div className="admin-actions"><span>Phone ID · ••••{status.phoneNumberIdLast4 ?? "—"}</span></div>
      </article>
      <article className="admin-transfer">
        <div>
          <p className="kicker">INTEGRACIÓN · CORREO</p>
          <h2>Notificaciones administrativas</h2>
          <p>Envía una prueba controlada al correo administrativo configurado, sin exponer la dirección ni las claves.</p>
          {emailMessage && <p>{emailMessage}</p>}
        </div>
        <div className="admin-actions"><button disabled={emailBusy} onClick={() => void sendEmailTest()}>{emailBusy ? "Enviando…" : "Enviar correo de prueba"}</button></div>
      </article>
    </div>}
  </section>;
}
