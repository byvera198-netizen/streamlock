import { env } from "cloudflare:workers";

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function isValidSignature(request: Request, rawBody: string) {
  const appSecret = env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) return true;

  const provided = request.headers.get("x-hub-signature-256") ?? "";
  if (!provided.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  return safeEqual(expected, provided);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode !== "subscribe" || !token || !challenge || !expectedToken || !safeEqual(token, expectedToken)) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await isValidSignature(request, rawBody))) return Response.json({ error: "Firma inválida." }, { status: 401 });

  try {
    const payload = JSON.parse(rawBody) as { object?: string; entry?: unknown[] };
    if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
      return Response.json({ error: "Evento de WhatsApp inválido." }, { status: 400 });
    }

    // Los estados y mensajes se procesarán de forma idempotente en la siguiente
    // fase. Respondemos 200 para que Meta no reintente eventos válidos.
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
