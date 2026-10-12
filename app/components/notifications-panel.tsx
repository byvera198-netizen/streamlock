"use client";

import { useEffect, useState } from "react";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  orderId: number | null;
  readAt: string | null;
  createdAt: string;
};
type Preferences = { inApp: boolean; email: boolean; whatsapp: boolean; sms: boolean };

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
}

export default function NotificationsPanel({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);

  async function loadNotifications() {
    const response = await fetch("/api/notifications");
    if (response.status === 401) { setLoading(false); return; }
    const payload = await response.json();
    if (response.ok) { setItems(payload.notifications ?? []); setUnread(payload.unread ?? 0); setPreferences(payload.preferences ?? null); }
    setLoading(false);
  }

  useEffect(() => { void loadNotifications(); }, []);

  async function markRead(item: Notification) {
    if (item.readAt) return;
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: item.id }) });
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    setUnread((current) => Math.max(0, current - 1));
  }

  async function updatePreference(key: keyof Preferences, value: boolean) {
    if (!preferences) return;
    setSavingPreferences(true);
    const response = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: { [key]: value } }) });
    if (response.ok) setPreferences((current) => current ? { ...current, [key]: value } : current);
    setSavingPreferences(false);
  }

  if (loading || (!items.length && !unread && !preferences)) return null;

  return <section className={`notifications-widget${compact ? " notifications-compact" : ""}`}>
    <button className="notifications-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span className="notification-bell" aria-hidden="true">◔</span>
      <span>Notificaciones</span>
      {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
    </button>
    {open && <div className="notifications-panel">
      <div className="notifications-panel-head"><div><p className="kicker">ACTIVIDAD DE TU CUENTA</p><h2>Avisos importantes</h2></div><button onClick={() => setOpen(false)} aria-label="Cerrar notificaciones">×</button></div>
      {items.length === 0 ? <p className="notifications-empty">No tienes avisos nuevos.</p> : <div className="notifications-list">{items.map((item) => <button className={`notification-item${item.readAt ? " is-read" : ""}`} key={item.id} onClick={() => void markRead(item)}><span className="notification-dot" /><span><strong>{item.title}</strong><small>{item.message}</small><time>{formatDate(item.createdAt)}{item.orderId ? ` · Pedido #${item.orderId}` : ""}</time></span></button>)}</div>}
      {preferences && <div className="notification-preferences"><p className="kicker">CANALES DE AVISO</p><label><span>Dentro de StreamLock</span><input type="checkbox" checked={preferences.inApp} onChange={(event) => void updatePreference("inApp", event.target.checked)} disabled={savingPreferences} /></label><label><span>Correo electrónico <small>Próximamente</small></span><input type="checkbox" checked={preferences.email} onChange={(event) => void updatePreference("email", event.target.checked)} disabled={savingPreferences} /></label><label><span>WhatsApp <small>Próximamente</small></span><input type="checkbox" checked={preferences.whatsapp} onChange={(event) => void updatePreference("whatsapp", event.target.checked)} disabled={savingPreferences} /></label><label><span>SMS <small>Próximamente</small></span><input type="checkbox" checked={preferences.sms} onChange={(event) => void updatePreference("sms", event.target.checked)} disabled={savingPreferences} /></label></div>}
    </div>}
  </section>;
}
