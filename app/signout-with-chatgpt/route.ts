import { ACCESS_SESSION_COOKIE } from "../access-session";

function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to"));
  const accessLogoutUrl = new URL("/cdn-cgi/access/logout", request.url);
  // Cloudflare Access mantiene una cookie independiente de la sesión de
  // StreamLock. Al cerrar ambas, el siguiente inicio permite elegir otra cuenta.
  accessLogoutUrl.searchParams.set("returnTo", returnTo);
  return new Response(null, {
    status: 303,
    headers: {
      Location: accessLogoutUrl.toString(),
      "Set-Cookie": `${ACCESS_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      "Cache-Control": "no-store",
    },
  });
}
