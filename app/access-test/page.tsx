import { headers } from "next/headers";
import { createAccessSessionToken } from "../access-session";

export const dynamic = "force-dynamic";

function safeReturnPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
}

export default async function AccessTestPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[] | undefined }>;
}) {
  const requestHeaders = await headers();
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  const email = requestHeaders.get("cf-access-authenticated-user-email");
  const fullName = requestHeaders.get("cf-access-authenticated-user-name");
  const sessionToken = email ? await createAccessSessionToken(email, fullName) : null;
  const identity = email ? "autenticada" : "no autenticada";

  return <main className="access-test-shell"><section className="access-test-card"><p className="kicker">ACCESO SEGURO · CLOUDFLARE ACCESS</p><h1>StreamLock Auth Check</h1><p>Esta ruta valida el acceso y permite continuar a la sesión protegida de StreamLock.</p><div className={`access-test-status ${email ? "is-authenticated" : "is-anonymous"}`}><span>{email ? "✓" : "!"}</span><div><b>Sesión {identity}</b><small>{email ?? "Cloudflare Access todavía no ha entregado identidad."}</small></div></div>{sessionToken && <form action="/api/access-session" method="post"><input type="hidden" name="token" value={sessionToken} /><input type="hidden" name="returnTo" value={returnTo} /><button className="access-test-continue" type="submit">Continuar a StreamLock →</button></form>}<p className="access-test-meta">Ruta: <code>/access-test</code></p></section></main>;
}
