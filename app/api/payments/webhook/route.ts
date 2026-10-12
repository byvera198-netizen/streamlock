import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { escrowLedger, orders } from "../../../../db/schema";

type PaymentEvent = {
  type?: "payment.succeeded" | "payment.failed" | "payment.refunded";
  orderId?: number;
  providerPaymentId?: string;
};

async function isValidSignature(request: Request, rawBody: string) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const provided = request.headers.get("x-streamlock-signature");
  if (!secret || !provided) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return expected === provided;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await isValidSignature(request, rawBody))) return Response.json({ error: "Firma inválida." }, { status: 401 });
  let event: PaymentEvent;
  try { event = JSON.parse(rawBody) as PaymentEvent; } catch { return Response.json({ error: "Evento inválido." }, { status: 400 }); }
  if (!event.orderId || !event.type) return Response.json({ error: "Faltan orderId o type." }, { status: 400 });

  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, event.orderId)).limit(1);
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });

  if (event.type === "payment.succeeded") {
    if (order.status === "payment_held") return Response.json({ ok: true, duplicate: true });
    await db.update(orders).set({ status: "payment_held" }).where(eq(orders.id, order.id));
    await db.update(escrowLedger).set({ status: "funds_held", heldAt: new Date().toISOString() }).where(eq(escrowLedger.orderId, order.id));
  } else if (event.type === "payment.failed") {
    await db.update(orders).set({ status: "payment_failed" }).where(eq(orders.id, order.id));
    await db.update(escrowLedger).set({ status: "payment_failed" }).where(eq(escrowLedger.orderId, order.id));
  } else {
    await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, order.id));
    await db.update(escrowLedger).set({ status: "refunded" }).where(eq(escrowLedger.orderId, order.id));
  }
  return Response.json({ ok: true, orderId: order.id, status: event.type });
}
