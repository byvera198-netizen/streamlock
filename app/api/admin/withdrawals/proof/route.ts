import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { withdrawals } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  const adminEmail = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !user || user.email.toLowerCase() !== adminEmail) return Response.json({ error: "No autorizado." }, { status: 403 });
  const withdrawalId = Number(new URL(request.url).searchParams.get("withdrawalId"));
  if (!Number.isInteger(withdrawalId)) return Response.json({ error: "Retiro inválido." }, { status: 400 });
  const [withdrawal] = await getDb().select({ transferProofKey: withdrawals.transferProofKey }).from(withdrawals).where(eq(withdrawals.id, withdrawalId)).limit(1);
  if (!withdrawal?.transferProofKey || !env.RECEIPTS) return Response.json({ error: "Comprobante no encontrado." }, { status: 404 });
  const object = await env.RECEIPTS.get(withdrawal.transferProofKey);
  if (!object) return Response.json({ error: "Comprobante no encontrado." }, { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream", "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
