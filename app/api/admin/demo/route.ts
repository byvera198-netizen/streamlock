import { count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  bankTransferSubmissions,
  deliveries,
  demoRecords,
  demoRuns,
  escrowLedger,
  notifications,
  orders,
  products,
  sellerBalances,
  stores,
} from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { hasAdminConfiguration, isAdminEmail } from "../../../admin-access";

async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!hasAdminConfiguration()) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || !isAdminEmail(user.email)) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

function createRunId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `DEMO-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

async function record(db: ReturnType<typeof getDb>, runId: string, entity: string, entityId: number | string) {
  await db.insert(demoRecords).values({ runId, entity, entityId: String(entityId) });
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const db = getDb();
  const runs = await db.select().from(demoRuns).orderBy(desc(demoRuns.createdAt));
  const result = [];
  for (const run of runs) {
    const [items] = await db.select({ value: count() }).from(demoRecords).where(eq(demoRecords.runId, run.id));
    result.push({ ...run, recordCount: Number(items?.value ?? 0) });
  }
  return Response.json({ runs: result });
}

export async function POST() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const db = getDb();
  const now = new Date().toISOString();
  const runId = createRunId();
  const sellerId = `demo:${runId}:seller`;
  const buyerId = `demo:${runId}:buyer`;
  const slug = runId.toLowerCase();
  const imageUrl = "https://static.swappa.com/images/cache/ea/cc/eacc0026acf927b54868504b1647d855.png";

  await db.insert(demoRuns).values({ id: runId, createdBy: access.user.userId, label: "Escenario de compra y venta DEMO", createdAt: now });
  try {
    const [store] = await db.insert(stores).values({ ownerId: sellerId, name: "DEMO · Vitrina de tecnología", slug, socialNetwork: "TikTok · cuenta demo", status: "verified", createdAt: now }).returning({ id: stores.id });
    if (!store) throw new Error("No se pudo crear la vitrina demo.");
    await record(db, runId, "store", store.id);

    const catalog = [
      ["DEMO · iPhone 17 Pro 256GB · Nuevo", "iPhone 17 Pro", "new", 1297],
      ["DEMO · iPhone 17 Pro 256GB · Open Box", "iPhone 17 Pro", "used", 1197],
      ["DEMO · Samsung Galaxy A27 5G · Nuevo", "Galaxy A27 5G", "new", 424.99],
      ["DEMO · Audífonos inalámbricos · Nuevo", "Audio Buds", "new", 79.99],
    ] as const;
    const createdProducts: Array<{ id: number; title: string }> = [];
    for (const [index, item] of catalog.entries()) {
      const [product] = await db.insert(products).values({
        storeId: store.id,
        title: item[0],
        description: "DATOS DEMO. No representa una oferta real. Revisa precio, disponibilidad, condición y garantía antes de publicar.",
        category: item[1].startsWith("iPhone") || item[1].startsWith("Galaxy") ? "mobile" : "accessory",
        brand: item[1].startsWith("iPhone") ? "Apple" : item[1].startsWith("Galaxy") ? "Samsung" : "Demo Brand",
        model: item[1],
        storage: item[1].includes("iPhone") ? "256 GB" : null,
        color: "Variado",
        condition: item[2],
        warrantyMonths: 12,
        priceCents: Math.round(item[3] * 100),
        stock: 20,
        status: "published",
        imageUrl,
        saleMode: "store",
        expiresAt: null,
        publicCode: `${runId}-${String(index + 1).padStart(2, "0")}`,
        createdAt: now,
      }).returning({ id: products.id, title: products.title });
      if (!product) throw new Error("No se pudo crear un producto demo.");
      createdProducts.push(product);
      await record(db, runId, "product", product.id);
    }

    const firstProduct = createdProducts[0];
    const [order] = await db.insert(orders).values({
      buyerId,
      storeId: store.id,
      productId: firstProduct.id,
      quantity: 1,
      unitPriceCents: 129700,
      subtotalCents: 129700,
      feeCents: 0,
      totalCents: 129700,
      status: "payment_pending",
      deliveryMethod: "courier",
      shippingName: "Cliente DEMO · no real",
      shippingPhone: "0990000000",
      shippingAddress: "Dirección DEMO · no real",
      legalAcceptedAt: now,
      confirmedAt: null,
      createdAt: now,
    }).returning({ id: orders.id });
    if (!order) throw new Error("No se pudo crear la orden demo.");
    await record(db, runId, "order", order.id);

    const [escrow] = await db.insert(escrowLedger).values({ orderId: order.id, amountCents: 129700, feeCents: 0, status: "awaiting_payment", heldAt: null, releasedAt: null }).returning({ id: escrowLedger.id });
    if (escrow) await record(db, runId, "escrow", escrow.id);
    const [transfer] = await db.insert(bankTransferSubmissions).values({ orderId: order.id, bank: "Banco DEMO", reference: `DEMO-${runId}`, amountCents: 129700, receiptUrl: null, status: "pending_review", submittedAt: now, reviewedAt: null }).returning({ id: bankTransferSubmissions.id });
    if (transfer) await record(db, runId, "bank_transfer", transfer.id);
    const [delivery] = await db.insert(deliveries).values({ orderId: order.id, method: "courier", carrier: "Courier DEMO", trackingCode: "DEMO-TRACKING-0001", status: "pending", pickupPin: null, pickupPinExpiresAt: null, deliveredAt: null, receivedAt: null }).returning({ id: deliveries.id });
    if (delivery) await record(db, runId, "delivery", delivery.id);
    const [buyerNotification] = await db.insert(notifications).values({ userId: buyerId, type: "payment_pending", title: "DEMO · Pago pendiente de revisión", message: "Este aviso pertenece a un escenario de prueba y no representa una transacción real.", orderId: order.id, readAt: null, createdAt: now }).returning({ id: notifications.id });
    if (buyerNotification) await record(db, runId, "notification", buyerNotification.id);
    const [sellerNotification] = await db.insert(notifications).values({ userId: sellerId, type: "payment_submitted", title: "DEMO · Comprobante recibido", message: "Escenario de prueba: la administración debe revisar el comprobante DEMO antes de confirmar la orden.", orderId: order.id, readAt: null, createdAt: now }).returning({ id: notifications.id });
    if (sellerNotification) await record(db, runId, "notification", sellerNotification.id);
    const [balance] = await db.insert(sellerBalances).values({ ownerId: sellerId, availableCents: 0, totalEarnedCents: 0, updatedAt: now }).returning({ ownerId: sellerBalances.ownerId });
    if (balance) await record(db, runId, "seller_balance", balance.ownerId);

    return Response.json({ ok: true, runId, storeId: store.id, productCount: createdProducts.length, orderId: order.id, message: "Lote DEMO creado. No contiene documentos, cuentas bancarias ni dinero real." }, { status: 201 });
  } catch (error) {
    await db.delete(demoRuns).where(eq(demoRuns.id, runId));
    throw error;
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const runId = new URL(request.url).searchParams.get("runId")?.trim() ?? "";
  if (!/^DEMO-[A-Z0-9-]+$/.test(runId)) return Response.json({ error: "Lote DEMO inválido." }, { status: 400 });
  const db = getDb();
  const [run] = await db.select().from(demoRuns).where(eq(demoRuns.id, runId)).limit(1);
  if (!run) return Response.json({ error: "Lote DEMO no encontrado." }, { status: 404 });
  const rows = await db.select({ entity: demoRecords.entity, entityId: demoRecords.entityId }).from(demoRecords).where(eq(demoRecords.runId, runId));
  const ids = (entity: string) => rows.filter(row => row.entity === entity).map(row => Number(row.entityId)).filter(Number.isInteger);
  const textIds = (entity: string) => rows.filter(row => row.entity === entity).map(row => row.entityId);
  await db.transaction(async (tx) => {
    const notificationIds = ids("notification");
    const orderIds = ids("order");
    const productIds = ids("product");
    const storeIds = ids("store");
    if (notificationIds.length) await tx.delete(notifications).where(inArray(notifications.id, notificationIds));
    if (orderIds.length) {
      await tx.delete(bankTransferSubmissions).where(inArray(bankTransferSubmissions.orderId, orderIds));
      await tx.delete(deliveries).where(inArray(deliveries.orderId, orderIds));
      await tx.delete(escrowLedger).where(inArray(escrowLedger.orderId, orderIds));
      await tx.delete(orders).where(inArray(orders.id, orderIds));
    }
    if (productIds.length) await tx.delete(products).where(inArray(products.id, productIds));
    if (storeIds.length) await tx.delete(stores).where(inArray(stores.id, storeIds));
    const sellerIds = textIds("seller_balance");
    if (sellerIds.length) await tx.delete(sellerBalances).where(inArray(sellerBalances.ownerId, sellerIds));
    await tx.delete(demoRecords).where(eq(demoRecords.runId, runId));
    await tx.update(demoRuns).set({ deletedAt: new Date().toISOString() }).where(eq(demoRuns.id, runId));
  });
  return Response.json({ ok: true, runId, message: "Lote DEMO eliminado. Los datos reales no fueron modificados." });
}
