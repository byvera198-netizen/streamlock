import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { bankTransferSubmissions } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { isAdminEmail } from "../../../../admin-access";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !isAdminEmail(user.email)) return Response.json({ error: "No autorizado." }, { status: 403 });
  const submissionId = Number(new URL(request.url).searchParams.get("submissionId"));
  if (!Number.isInteger(submissionId)) return Response.json({ error: "Comprobante inválido." }, { status: 400 });
  const [submission] = await getDb().select().from(bankTransferSubmissions).where(eq(bankTransferSubmissions.id, submissionId)).limit(1);
  if (!submission?.receiptUrl?.startsWith("r2://")) return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
  const object = await env.RECEIPTS.get(submission.receiptUrl.slice(5));
  if (!object) return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream", "Content-Disposition": "inline" } });
}
