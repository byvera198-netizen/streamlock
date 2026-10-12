import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { disputes, escrowLedger, orders, products, stores } from "../../../../db/schema";
import { createNotification } from "../../../../db/notifications";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function requireAdmin() {
  const user = await getChatGPTUser();
  const email = process.env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || user.email.toLowerCase() !== email) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const rows = await getDb().select({ dispute: disputes, order: orders, product: products, store: stores }).from(disputes)
    .innerJoin(orders, eq(disputes.orderId, orders.id)).innerJoin(products, eq(orders.productId, products.id)).innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(disputes.status, "open"));
  return Response.json({ disputes: rows });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { disputeId?: number; decision?: "refund" | "release" | "reject"; resolution?: string };
  const disputeId = Number(body.disputeId);
  if (!Number.isInteger(disputeId) || !body.decision || !body.resolution?.trim()) return Response.json({ error: "Decisión y resolución son obligatorias." }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ dispute: disputes, order: orders, store: stores }).from(disputes).innerJoin(orders, eq(disputes.orderId, orders.id)).innerJoin(stores, eq(orders.storeId, stores.id)).where(and(eq(disputes.id, disputeId), eq(disputes.status, "open"))).limit(1);
  if (!row) return Response.json({ error: "Disputa no encontrada o ya resuelta." }, { status: 404 });
  const now = new Date().toISOString();
  const refund = body.decision === "refund";
  await db.update(disputes).set({ status: refund ? "refunded" : body.decision === "release" ? "resolved" : "rejected", resolution: body.resolution.trim().slice(0, 2000), resolvedAt: now }).where(eq(disputes.id, disputeId));
  await db.update(orders).set({ status: refund ? "refunded" : "completed" }).where(eq(orders.id, row.order.id));
  await db.update(escrowLedger).set({ status: refund ? "refunded" : "released", releasedAt: refund ? undefined : now }).where(eq(escrowLedger.orderId, row.order.id));
  await createNotification(db, { userId: row.order.buyerId, type: "dispute_resolved", title: "Disputa resuelta", message: `La disputa del pedido #${row.order.id} fue resuelta: ${refund ? "se aprobó un reembolso" : "se cerró a favor del vendedor"}.`, orderId: row.order.id });
  await createNotification(db, { userId: row.store.ownerId, type: "dispute_resolved", title: "Disputa de pedido resuelta", message: `La disputa del pedido #${row.order.id} fue resuelta por el administrador.`, orderId: row.order.id });
  return Response.json({ ok: true, orderId: row.order.id, status: refund ? "refunded" : "completed" });
}
