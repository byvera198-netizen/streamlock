type OrderAbandonmentEnvironment = { DB?: D1Database };

type AbandonedOrder = { order_id: number; buyer_id: string; product_id: number; quantity: number };

export type OrderAbandonmentResult = { checked: number; cancelled: number };

const ABANDONED_AFTER_MS = 30 * 60 * 1000;

/** Cancels unpaid orders without a submitted bank receipt and returns stock. */
export async function cancelAbandonedOrders(
  environment: OrderAbandonmentEnvironment,
  now = new Date().toISOString(),
): Promise<OrderAbandonmentResult> {
  if (!environment.DB) throw new Error("Cloudflare D1 binding DB is unavailable.");
  const cutoff = new Date(Date.parse(now) - ABANDONED_AFTER_MS).toISOString().replace("T", " ").slice(0, 19);
  const pending = await environment.DB.prepare(
    `SELECT o.id AS order_id, o.buyer_id, o.product_id, o.quantity
     FROM orders o
     LEFT JOIN bank_transfer_submissions b ON b.order_id = o.id
     WHERE o.status = 'payment_pending'
       AND o.created_at <= ?
       AND b.id IS NULL
     ORDER BY o.id ASC`,
  ).bind(cutoff).all<AbandonedOrder>();

  const result: OrderAbandonmentResult = { checked: pending.results?.length ?? 0, cancelled: 0 };
  for (const order of pending.results ?? []) {
    const cancelled = await environment.DB.prepare(
      `UPDATE orders
       SET status = 'payment_failed'
       WHERE id = ?
         AND status = 'payment_pending'
         AND NOT EXISTS (SELECT 1 FROM bank_transfer_submissions WHERE order_id = ?)`,
    ).bind(order.order_id, order.order_id).run();
    if ((cancelled.meta.changes ?? 0) !== 1) continue;

    await environment.DB.batch([
      environment.DB.prepare("UPDATE escrow_ledger SET status = 'payment_failed' WHERE order_id = ? AND status = 'awaiting_payment'").bind(order.order_id),
      environment.DB.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").bind(order.quantity, order.product_id),
      environment.DB.prepare(
        `INSERT INTO notifications (user_id, type, title, message, order_id, created_at)
         VALUES (?, 'order_expired', 'Orden cancelada por falta de pago', ?, ?, ?)`,
      ).bind(order.buyer_id, `La orden #${order.order_id} expiró después de 30 minutos sin registrar un comprobante. El stock fue liberado.`, order.order_id, now),
    ]);
    result.cancelled += 1;
  }
  return result;
}
