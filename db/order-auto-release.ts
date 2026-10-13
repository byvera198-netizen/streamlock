type AutoReleaseEnvironment = {
  DB?: D1Database;
};

type EligibleDelivery = {
  order_id: number;
  buyer_id: string;
  owner_id: string;
  subtotal_cents: number;
  fee_cents: number;
};

export type AutoReleaseResult = {
  checked: number;
  released: number;
  deferredByDispute: number;
};

const AUTO_RELEASE_AFTER_MS = 24 * 60 * 60 * 1000;

export async function autoReleaseDeliveredOrders(
  environment: AutoReleaseEnvironment,
  now = new Date().toISOString(),
): Promise<AutoReleaseResult> {
  if (!environment.DB) throw new Error("Cloudflare D1 binding DB is unavailable.");

  const result: AutoReleaseResult = { checked: 0, released: 0, deferredByDispute: 0 };
  const cutoff = new Date(Date.parse(now) - AUTO_RELEASE_AFTER_MS).toISOString();
  const eligible = await environment.DB
    .prepare(
      `SELECT o.id AS order_id, o.buyer_id, s.owner_id, o.subtotal_cents, o.fee_cents
       FROM deliveries d
       INNER JOIN orders o ON o.id = d.order_id
       INNER JOIN stores s ON s.id = o.store_id
       INNER JOIN escrow_ledger e ON e.order_id = o.id AND e.status = 'funds_held'
       WHERE d.method = 'courier'
         AND d.status = 'delivered'
         AND d.delivered_at IS NOT NULL
         AND d.delivered_at <= ?
         AND o.status = 'shipped'
       ORDER BY o.id ASC`,
    )
    .bind(cutoff)
    .all<EligibleDelivery>();

  const orders = eligible.results ?? [];
  result.checked = orders.length;

  for (const order of orders) {
    const dispute = await environment.DB
      .prepare("SELECT id FROM disputes WHERE order_id = ? AND status = 'open' LIMIT 1")
      .bind(order.order_id)
      .first<{ id: number }>();
    if (dispute) {
      result.deferredByDispute += 1;
      continue;
    }

    const releasedAt = now;
    await environment.DB.batch([
      environment.DB
        .prepare("UPDATE orders SET status = 'completed' WHERE id = ? AND status = 'shipped'")
        .bind(order.order_id),
      environment.DB
        .prepare("UPDATE deliveries SET received_at = COALESCE(received_at, ?) WHERE order_id = ? AND status = 'delivered'")
        .bind(releasedAt, order.order_id),
      environment.DB
        .prepare("UPDATE escrow_ledger SET status = 'released', released_at = ? WHERE order_id = ? AND status = 'funds_held'")
        .bind(releasedAt, order.order_id),
      environment.DB
        .prepare(
          `INSERT INTO seller_balances (owner_id, available_cents, total_earned_cents, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(owner_id) DO UPDATE SET
             available_cents = seller_balances.available_cents + excluded.available_cents,
             total_earned_cents = seller_balances.total_earned_cents + excluded.total_earned_cents,
             updated_at = excluded.updated_at`,
        )
        .bind(order.owner_id, order.subtotal_cents, order.subtotal_cents, releasedAt),
      environment.DB
        .prepare(
          `INSERT INTO balance_transactions (owner_id, order_id, type, amount_cents, fee_cents)
           VALUES (?, ?, 'sale_released_auto', ?, ?)`,
        )
        .bind(order.owner_id, order.order_id, order.subtotal_cents, order.fee_cents),
      environment.DB
        .prepare(
          `INSERT INTO notifications (user_id, type, title, message, order_id, created_at)
           VALUES (?, 'order_auto_completed', 'Pedido completado automáticamente', ?, ?, ?)`,
        )
        .bind(order.buyer_id, `El pedido #${order.order_id} se cerró después de 24 horas sin una disputa abierta.`, order.order_id, releasedAt),
      environment.DB
        .prepare(
          `INSERT INTO notifications (user_id, type, title, message, order_id, created_at)
           VALUES (?, 'funds_released', 'Fondos liberados', ?, ?, ?)`,
        )
        .bind(order.owner_id, `Los fondos del pedido #${order.order_id} fueron liberados automáticamente.`, order.order_id, releasedAt),
    ]);
    result.released += 1;
  }

  return result;
}
