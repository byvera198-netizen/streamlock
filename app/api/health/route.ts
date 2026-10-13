import { env } from "cloudflare:workers";

export async function GET() {
  const checks = { database: false, storage: Boolean(env.RECEIPTS) };
  try {
    if (env.DB) {
      await env.DB.prepare("SELECT 1 AS ok").first();
      checks.database = true;
    }
  } catch {
    // Keep the response intentionally generic: health checks must not reveal
    // database or binding details to anonymous visitors.
  }

  const healthy = checks.database && checks.storage;
  return Response.json(
    { status: healthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
