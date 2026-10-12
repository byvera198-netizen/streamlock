import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { products } from "../../../../db/schema";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  const imageUrl = `r2://${key}`;
  if (!key || key.includes("..") || !key.startsWith("product-images/")) return new Response("Imagen inválida.", { status: 400 });
  const [product] = await getDb().select({ id: products.id }).from(products).where(and(eq(products.imageUrl, imageUrl), eq(products.status, "published"))).limit(1);
  if (!product || !env.RECEIPTS) return new Response("Imagen no encontrada.", { status: 404 });
  const object = await env.RECEIPTS.get(key);
  if (!object) return new Response("Imagen no encontrada.", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", ETag: object.httpEtag } });
}
