import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AccessTestPage() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("cf-access-authenticated-user-email");
  const identity = email ? "autenticada" : "no autenticada";

  return <main className="access-test-shell"><section className="access-test-card"><p className="kicker">PRUEBA CONTROLADA · CLOUDFLARE ACCESS</p><h1>StreamLock Auth Check</h1><p>Esta ruta existe únicamente para validar el acceso de prueba sin bloquear la tienda pública.</p><div className={`access-test-status ${email ? "is-authenticated" : "is-anonymous"}`}><span>{email ? "✓" : "!"}</span><div><b>Sesión {identity}</b><small>{email ?? "Cloudflare Access todavía no ha entregado identidad."}</small></div></div><p className="access-test-meta">Ruta: <code>/access-test</code></p></section></main>;
}
