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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type WhatsAppPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messages?: Array<{ id?: string; type?: string }>;
        statuses?: Array<{ id?: string; status?: string }>;
      };
    }>;
  }>;
};

function getEventKeys(payload: WhatsAppPayload, payloadHash: string) {
  const keys: Array<{ key: string; type: string }> = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const prefix = `${entry.id ?? "unknown"}:${change.field ?? "unknown"}`;
      for (const message of change.value?.messages ?? []) {
        if (message.id) keys.push({ key: `${prefix}:message:${message.id}`, type: "message" });
      }
      for (const status of change.value?.statuses ?? []) {
        if (status.id) keys.push({ key: `${prefix}:status:${status.id}`, type: `status:${status.status ?? "unknown"}` });
      }
      if (!(change.value?.messages?.length || change.value?.statuses?.length)) {
        keys.push({ key: `${prefix}:change:${payloadHash}`, type: "change" });
      }
    }
  }
  return keys;
}

async function recordEvents(payload: WhatsAppPayload, rawBody: string) {
  if (!env.DB) throw new Error("D1 no disponible para registrar el webhook.");
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
      event_key TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ).run();

  const payloadHash = await sha256Hex(rawBody);
  const keys = getEventKeys(payload, payloadHash);
  if (!keys.length) return { received: 0, duplicates: 0 };

  const receivedAt = new Date().toISOString();
  const results = await env.DB.batch(
    keys.map(({ key, type }) =>
      env.DB!
        .prepare(
          "INSERT OR IGNORE INTO whatsapp_webhook_events (event_key, event_type, payload_hash, received_at) VALUES (?, ?, ?, ?)",
        )
        .bind(key, type, payloadHash, receivedAt),
    ),
  );
  const inserted = results.reduce((total, result) => total + (result.meta.changes ?? 0), 0);
  return { received: inserted, duplicates: keys.length - inserted };
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
    const payload = JSON.parse(rawBody) as WhatsAppPayload;
    if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
      return Response.json({ error: "Evento de WhatsApp inválido." }, { status: 400 });
    }

    const events = await recordEvents(payload, rawBody);
    return Response.json({ ok: true, events });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSON inválido." }, { status: 400 });
    return Response.json({ error: "No se pudo registrar el evento." }, { status: 503 });
  }
}
