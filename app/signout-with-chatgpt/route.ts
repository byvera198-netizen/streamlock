import { ACCESS_SESSION_COOKIE } from "../access-session";

function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return new Response(null, {
    status: 303,
    headers: {
      Location: safeReturnPath(url.searchParams.get("return_to")),
      "Set-Cookie": `${ACCESS_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      "Cache-Control": "no-store",
    },
  });
}
