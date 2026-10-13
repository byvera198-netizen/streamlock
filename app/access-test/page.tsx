import { headers } from "next/headers";
import { createAccessSessionToken } from "../access-session";

export const dynamic = "force-dynamic";

export default async function AccessTestPage() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("cf-access-authenticated-user-email");
  const fullName = requestHeaders.get("cf-access-authenticated-user-name");
  const sessionToken = email ? await createAccessSessionToken(email, fullName) : null;
  const identity = email ? "autenticada" : "no autenticada";

  return <main className="access-test-shell"><section className="access-test-card"><p className="kicker">PRUEBA CONTROLADA · CLOUDFLARE ACCESS</p><h1>StreamLock Auth Check</h1><p>Esta ruta valida el acceso y permite continuar a la sesión protegida de StreamLock.</p><div className={`access-test-status ${email ? "is-authenticated" : "is-anonymous"}`}><span>{email ? "✓" : "!"}</span><div><b>Sesión {identity}</b><small>{email ?? "Cloudflare Access todavía no ha entregado identidad."}</small></div></div>{sessionToken && <form action="/api/access-session" method="post"><input type="hidden" name="token" value={sessionToken} /><input type="hidden" name="returnTo" value="/" /><button className="access-test-continue" type="submit">Continuar a StreamLock →</button></form>}<p className="access-test-meta">Ruta: <code>/access-test</code></p></section></main>;
}
