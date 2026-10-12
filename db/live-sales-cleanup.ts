type CleanupEnvironment = {
  DB?: D1Database;
  RECEIPTS?: R2Bucket;
};

type ExpiredProduct = {
  id: number;
  image_url: string | null;
  status: string;
};

export type LiveSalesCleanupResult = {
  checked: number;
  expired: number;
  imagesDeleted: number;
  imagesDeferred: number;
};

/**
 * Expires Live products and removes temporary media when the related order
 * lifecycle is closed. The query is deliberately idempotent because it runs
 * from both the hourly Worker cron and the admin maintenance endpoint.
 */
export async function cleanupExpiredLiveSales(
  environment: CleanupEnvironment,
  now = new Date().toISOString(),
): Promise<LiveSalesCleanupResult> {
  if (!environment.DB) throw new Error("Cloudflare D1 binding DB is unavailable.");

  const result: LiveSalesCleanupResult = {
    checked: 0,
    expired: 0,
    imagesDeleted: 0,
    imagesDeferred: 0,
  };

  const expired = await environment.DB
    .prepare(
      `SELECT id, image_url, status
       FROM products
       WHERE sale_mode = 'live'
         AND expires_at IS NOT NULL
         AND expires_at <= ?
         AND status IN ('published', 'expired')
       ORDER BY id ASC`,
    )
    .bind(now)
    .all<ExpiredProduct>();

  const products = expired.results ?? [];
  result.checked = products.length;

  for (const product of products) {
    const statusUpdate = await environment.DB
      .prepare("UPDATE products SET status = 'expired' WHERE id = ? AND status = 'published'")
      .bind(product.id)
      .run();
    result.expired += statusUpdate.meta.changes ?? 0;

    const activeOrder = await environment.DB
      .prepare(
        `SELECT id
         FROM orders
         WHERE product_id = ?
           AND status NOT IN ('completed', 'refunded', 'payment_failed')
         LIMIT 1`,
      )
      .bind(product.id)
      .first<{ id: number }>();

    if (activeOrder) {
      result.imagesDeferred += product.image_url ? 1 : 0;
      continue;
    }

    let imageCanBeDetached = !product.image_url;
    if (product.image_url?.startsWith("r2://")) {
      const key = product.image_url.slice(5);
      const sharedImage = await environment.DB
        .prepare("SELECT id FROM products WHERE image_url = ? AND id <> ? LIMIT 1")
        .bind(product.image_url, product.id)
        .first<{ id: number }>();

      if (sharedImage) {
        imageCanBeDetached = true;
      } else if (environment.RECEIPTS) {
        await environment.RECEIPTS.delete(key);
        imageCanBeDetached = true;
        result.imagesDeleted += 1;
      } else {
        result.imagesDeferred += 1;
      }
    } else if (product.image_url) {
      // External URLs are not owned by StreamLock; detach the expired listing
      // without attempting to delete a resource on another service.
      imageCanBeDetached = true;
    }

    if (imageCanBeDetached) {
      await environment.DB
        .prepare("UPDATE products SET image_url = NULL WHERE id = ? AND status = 'expired'")
        .bind(product.id)
        .run();
    }
  }

  return result;
}
