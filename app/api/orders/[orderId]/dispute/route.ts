import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { disputes, escrowLedger, orders } from "../../../../../db/schema";
import { createNotification } from "../../../../../db/notifications";
import { getChatGPTUser } from "../../../../../app/chatgpt-auth";

const allowedReasons = ["not_received", "damaged", "not_as_described", "other"];

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const buyer = await getChatGPTUser();
  if (!buyer) return Response.json({ error: "Inicia sesión para abrir una disputa." }, { status: 401 });
  const orderId = Number((await params).orderId);
  const body = await request.json() as { reason?: string; description?: string };
  if (!Number.isInteger(orderId) || !allowedReasons.includes(body.reason ?? "") || !body.description?.trim()) return Response.json({ error: "Indica un motivo y describe el problema." }, { status: 400 });
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.buyerId, buyer.userId))).limit(1);
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  if (!["shipped", "ready_for_pickup", "completed"].includes(order.status)) return Response.json({ error: "La orden aún no está en un estado reclamable." }, { status: 409 });
  const [existing] = await db.select().from(disputes).where(eq(disputes.orderId, orderId)).limit(1);
  if (existing) return Response.json({ error: "Esta orden ya tiene una disputa registrada." }, { status: 409 });
  const [dispute] = await db.insert(disputes).values({ orderId, openedBy: buyer.userId, reason: body.reason!, description: body.description.trim().slice(0, 2000), status: "open" }).returning();
  await db.update(orders).set({ status: "disputed" }).where(eq(orders.id, orderId));
  await db.update(escrowLedger).set({ status: "disputed" }).where(eq(escrowLedger.orderId, orderId));
  await createNotification(db, { userId: buyer.userId, type: "dispute_opened", title: "Disputa abierta", message: `Tu reclamo del pedido #${orderId} está en revisión.`, orderId });
  return Response.json({ dispute, orderStatus: "disputed" }, { status: 201 });
}
