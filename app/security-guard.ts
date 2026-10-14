import { env } from "cloudflare:workers";

type AuditEvent = {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string | number | null;
  metadata?: Record<string, unknown>;
};

async function hashedRateKey(request: Request, scope: string, identity: string) {
  const ip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For") ?? "unknown";
  const input = new TextEncoder().encode(`${scope}:${identity}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${scope}:${hash}`;
}

export async function allowRateLimit(request: Request, scope: string, identity: string, limit: number, windowMs: number) {
  if (!env.DB) return true;
  try {
    const windowSeconds = Math.max(60, Math.floor(windowMs / 1000));
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
    const key = await hashedRateKey(request, scope, identity);
    const current = await env.DB.prepare("SELECT window_started_at, hits FROM request_rate_limits WHERE rate_key = ?").bind(key).first<{ window_started_at: number; hits: number }>();
    if (!current || Number(current.window_started_at) !== windowStart) {
      await env.DB.prepare("INSERT INTO request_rate_limits (rate_key, window_started_at, hits) VALUES (?, ?, 1) ON CONFLICT(rate_key) DO UPDATE SET window_started_at = excluded.window_started_at, hits = excluded.hits").bind(key, windowStart).run();
      return true;
    }
    if (Number(current.hits) >= limit) return false;
    await env.DB.prepare("UPDATE request_rate_limits SET hits = hits + 1 WHERE rate_key = ? AND window_started_at = ?").bind(key, windowStart).run();
    return true;
  } catch {
    return true;
  }
}

export async function recordAuditEvent(event: AuditEvent) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      "INSERT INTO security_audit_events (actor_id, action, target_type, target_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(event.actorId, event.action, event.targetType ?? null, event.targetId == null ? null : String(event.targetId), event.metadata ? JSON.stringify(event.metadata) : null, new Date().toISOString()).run();
  } catch {
    // Auditoría adicional: nunca debe deshacer una operación ya validada.
  }
}
