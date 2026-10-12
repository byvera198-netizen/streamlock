import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bankTransferSubmissions, escrowLedger, orders, products, stores } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function requireAdmin() {
  const user = await getChatGPTUser();
  const configuredEmail = process.env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || user.email.toLowerCase() !== configuredEmail) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const rows = await getDb().select({ submission: bankTransferSubmissions, order: orders, product: products, store: stores })
    .from(bankTransferSubmissions).innerJoin(orders, eq(bankTransferSubmissions.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id)).innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(bankTransferSubmissions.status, "pending_review"));
  return Response.json({ transfers: rows });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { submissionId?: number; decision?: "approve" | "reject" };
  const submissionId = Number(body.submissionId);
  if (!Number.isInteger(submissionId) || !body.decision) return Response.json({ error: "Decisión inválida." }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ submission: bankTransferSubmissions, order: orders }).from(bankTransferSubmissions)
    .innerJoin(orders, eq(bankTransferSubmissions.orderId, orders.id)).where(and(eq(bankTransferSubmissions.id, submissionId), eq(bankTransferSubmissions.status, "pending_review"))).limit(1);
  if (!row) return Response.json({ error: "Comprobante no encontrado o ya revisado." }, { status: 404 });
  const approved = body.decision === "approve";
  await db.update(bankTransferSubmissions).set({ status: approved ? "approved" : "rejected", reviewedAt: new Date().toISOString() }).where(eq(bankTransferSubmissions.id, submissionId));
  await db.update(orders).set({ status: approved ? "payment_held" : "payment_failed" }).where(eq(orders.id, row.order.id));
  await db.update(escrowLedger).set({ status: approved ? "funds_held" : "payment_failed", ...(approved ? { heldAt: new Date().toISOString() } : {}) }).where(eq(escrowLedger.orderId, row.order.id));
  return Response.json({ ok: true, orderId: row.order.id, status: approved ? "payment_held" : "payment_failed" });
}
