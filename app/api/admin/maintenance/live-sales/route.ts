import { env } from "cloudflare:workers";
import { cleanupExpiredLiveSales } from "../../../../../db/live-sales-cleanup";
import { getChatGPTUser } from "../../../../chatgpt-auth";

async function requireAdmin() {
  const user = await getChatGPTUser();
  const email = process.env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || user.email.toLowerCase() !== email) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

export async function POST() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;

  const result = await cleanupExpiredLiveSales({ DB: env.DB, RECEIPTS: env.RECEIPTS });
  return Response.json({ ok: true, result });
}
