import { ACCESS_SESSION_COOKIE, readAccessSessionToken } from "../../../app/access-session";

function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const token = typeof form.get("token") === "string" ? String(form.get("token")) : null;
  const user = await readAccessSessionToken(token);
  if (!user || !token) return Response.json({ error: "Sesión de acceso inválida o vencida." }, { status: 401 });

  return new Response(null, {
    status: 303,
    headers: {
      Location: safeReturnPath(typeof form.get("returnTo") === "string" ? String(form.get("returnTo")) : null),
      "Set-Cookie": `${ACCESS_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`,
      "Cache-Control": "no-store",
    },
  });
}
