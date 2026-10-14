import type { MetadataRoute } from "next";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import { products, stores } from "../db/schema";
import { getPublicUrl } from "./public-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicUrl();
  const staticPages = ["/", "/terms", "/privacy", "/refunds", "/mobile-reference"].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.5,
  }));

  try {
    const rows = await getDb().select({ store: stores, product: products }).from(stores)
      .leftJoin(products, and(eq(products.storeId, stores.id), eq(products.status, "published"), gt(products.stock, 0), or(eq(products.saleMode, "store"), and(eq(products.saleMode, "live"), or(isNull(products.expiresAt), gt(products.expiresAt, new Date().toISOString()))))));
    const urls = new Map<string, MetadataRoute.Sitemap[number]>();
    for (const row of rows) {
      if (row.store.status !== "verified") continue;
      urls.set(`/s/${row.store.slug}`, { url: `${baseUrl}/s/${row.store.slug}`, changeFrequency: "daily", priority: 0.8 });
      if (row.product) urls.set(`/checkout/${row.product.id}`, { url: `${baseUrl}/checkout/${row.product.id}`, changeFrequency: "daily", priority: 0.6 });
    }
    return [...staticPages, ...urls.values()];
  } catch {
    return staticPages;
  }
}
