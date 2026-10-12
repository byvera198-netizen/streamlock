import { and, eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { bankTransferSubmissions, escrowLedger, orders, products, stores } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createNotification } from "../../../../db/notifications";
import { sendSupportEmail } from "../../../email";

async function requireAdmin() {
  const user = await getChatGPTUser();
  const configuredEmail = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
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
  const [row] = await db.select({ submission: bankTransferSubmissions, order: orders, store: stores }).from(bankTransferSubmissions)
    .innerJoin(orders, eq(bankTransferSubmissions.orderId, orders.id)).innerJoin(stores, eq(orders.storeId, stores.id)).where(and(eq(bankTransferSubmissions.id, submissionId), eq(bankTransferSubmissions.status, "pending_review"))).limit(1);
  if (!row) return Response.json({ error: "Comprobante no encontrado o ya revisado." }, { status: 404 });
  if (row.order.status !== "payment_pending") return Response.json({ error: "La orden ya cambió de estado y requiere revisión manual." }, { status: 409 });
  const approved = body.decision === "approve";
  const [reviewed] = await db.update(bankTransferSubmissions).set({ status: approved ? "approved" : "rejected", reviewedAt: new Date().toISOString() }).where(and(eq(bankTransferSubmissions.id, submissionId), eq(bankTransferSubmissions.status, "pending_review"))).returning({ id: bankTransferSubmissions.id });
  if (!reviewed) return Response.json({ error: "El comprobante ya fue revisado por otro administrador." }, { status: 409 });
  await db.update(orders).set({ status: approved ? "payment_held" : "payment_failed" }).where(eq(orders.id, row.order.id));
  await db.update(escrowLedger).set({ status: approved ? "funds_held" : "payment_failed", ...(approved ? { heldAt: new Date().toISOString() } : {}) }).where(eq(escrowLedger.orderId, row.order.id));
  if (!approved) await db.update(products).set({ stock: sql`${products.stock} + ${row.order.quantity}` }).where(eq(products.id, row.order.productId));
  await createNotification(db, { userId: row.order.buyerId, type: approved ? "payment_approved" : "payment_rejected", title: approved ? "Pago protegido" : "Pago rechazado", message: approved ? `Tu pago del pedido #${row.order.id} fue verificado y quedó protegido.` : `No pudimos validar el comprobante del pedido #${row.order.id}.`, orderId: row.order.id });
  if (approved) await createNotification(db, { userId: row.store.ownerId, type: "payment_approved", title: "Pago garantizado", message: `El pago del pedido #${row.order.id} fue verificado. Ya puedes preparar el despacho.`, orderId: row.order.id });
  await sendSupportEmail(`StreamLock · Transferencia ${approved ? "aprobada" : "rechazada"} · Pedido #${row.order.id}`, `<p>La transferencia del pedido <strong>#${row.order.id}</strong> fue ${approved ? "aprobada y retenida en custodia" : "rechazada"}.</p>`, `bank-transfer-review/${submissionId}/${approved ? "approved" : "rejected"}`);
  return Response.json({ ok: true, orderId: row.order.id, status: approved ? "payment_held" : "payment_failed" });
}
