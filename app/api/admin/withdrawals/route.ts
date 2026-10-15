import { and, desc, eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { balanceTransactions, payoutAccounts, sellerBalances, withdrawals } from "../../../../db/schema";
import { createNotification } from "../../../../db/notifications";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { recordAuditEvent } from "../../../security-guard";
import { hasAdminConfiguration, isAdminEmail } from "../../../admin-access";

async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!hasAdminConfiguration()) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || !isAdminEmail(user.email)) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const items = await getDb().select({ id: withdrawals.id, ownerId: withdrawals.ownerId, payoutAccountId: withdrawals.payoutAccountId, amountCents: withdrawals.amountCents, method: withdrawals.method, destination: withdrawals.destination, transferReference: withdrawals.transferReference, hasTransferProof: withdrawals.transferProofKey, status: withdrawals.status, reviewedAt: withdrawals.reviewedAt, createdAt: withdrawals.createdAt, payoutBankName: payoutAccounts.bankName, payoutAccountLast4: payoutAccounts.accountNumberLast4, payoutAccountStatus: payoutAccounts.status }).from(withdrawals).leftJoin(payoutAccounts, eq(withdrawals.payoutAccountId, payoutAccounts.id)).where(eq(withdrawals.status, "pending_review")).orderBy(desc(withdrawals.id));
  return Response.json({ withdrawals: items.map(({ hasTransferProof, ...item }) => ({ ...item, hasTransferProof: Boolean(hasTransferProof) })) });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const form = isMultipart ? await request.formData() : null;
  const body = isMultipart ? { withdrawalId: form?.get("withdrawalId"), decision: form?.get("decision"), transferReference: form?.get("transferReference"), transferProof: form?.get("transferProof") } : { ...(await request.json() as Record<string, unknown>), transferProof: null };
  const id = Number(body.withdrawalId);
  const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : null;
  const transferReference = typeof body.transferReference === "string" ? body.transferReference.trim().replace(/\s+/g, " ") : "";
  const transferProof = body.transferProof instanceof File && body.transferProof.size > 0 ? body.transferProof : null;
  if (!Number.isInteger(id) || !decision) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  if (decision === "approve" && (transferReference.length < 3 || transferReference.length > 120)) return Response.json({ error: "Indica la referencia bancaria de la transferencia realizada." }, { status: 400 });
  if (transferProof && (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(transferProof.type) || transferProof.size > 5 * 1024 * 1024)) return Response.json({ error: "El comprobante debe ser PDF, JPG, PNG o WebP de máximo 5 MB." }, { status: 400 });
  const db = getDb();
  const [item] = await db.select().from(withdrawals).where(and(eq(withdrawals.id, id), eq(withdrawals.status, "pending_review"))).limit(1);
  if (!item) return Response.json({ error: "Retiro no encontrado o ya revisado." }, { status: 404 });
  const now = new Date().toISOString();
  let transferProofKey: string | null = null;
  if (decision === "approve" && transferProof) {
    if (!env.RECEIPTS) return Response.json({ error: "El almacenamiento de comprobantes no está disponible." }, { status: 503 });
    const extension = transferProof.type === "application/pdf" ? "pdf" : transferProof.type.split("/")[1] ?? "bin";
    transferProofKey = `payout-proofs/${item.ownerId}/${id}-${crypto.randomUUID()}.${extension}`;
    await env.RECEIPTS.put(transferProofKey, transferProof.stream(), { httpMetadata: { contentType: transferProof.type } });
  }
  const [processed] = await db.update(withdrawals).set({ status: decision === "approve" ? "paid" : "rejected", reviewedAt: now, transferReference: decision === "approve" ? transferReference : null, transferProofKey: decision === "approve" ? transferProofKey : null }).where(and(eq(withdrawals.id, id), eq(withdrawals.status, "pending_review"))).returning({ id: withdrawals.id });
  if (!processed) return Response.json({ error: "El retiro ya fue procesado por otro administrador." }, { status: 409 });
  if (decision === "reject") {
    await db.update(sellerBalances).set({ availableCents: sql`${sellerBalances.availableCents} + ${item.amountCents}`, updatedAt: now }).where(eq(sellerBalances.ownerId, item.ownerId));
    await db.insert(balanceTransactions).values({ ownerId: item.ownerId, type: "withdrawal_rejected", amountCents: item.amountCents, feeCents: 0 });
  } else {
    await db.insert(balanceTransactions).values({ ownerId: item.ownerId, type: "withdrawal_paid", amountCents: 0, feeCents: 0 });
  }
  await createNotification(db, {
    userId: item.ownerId,
    type: decision === "approve" ? "withdrawal_paid" : "withdrawal_rejected",
    title: decision === "approve" ? "Retiro pagado" : "Retiro rechazado",
    message: decision === "approve" ? `Tu retiro de $${(item.amountCents / 100).toFixed(2)} fue transferido. Referencia: ${transferReference}.` : `Tu retiro de $${(item.amountCents / 100).toFixed(2)} fue rechazado y el saldo fue devuelto.`,
  });
  await recordAuditEvent({ actorId: access.user.userId, action: "admin_withdrawal_review", targetType: "withdrawal", targetId: id, metadata: { decision, transferReference: decision === "approve" ? transferReference : null, hasTransferProof: Boolean(transferProofKey), amountCents: item.amountCents } });
  return Response.json({ ok: true, status: decision === "approve" ? "paid" : "rejected", transferReference: decision === "approve" ? transferReference : null });
}
