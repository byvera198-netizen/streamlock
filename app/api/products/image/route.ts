import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { stores } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para subir imágenes." }, { status: 401 });
  const form = await request.formData();
  const storeId = Number(form.get("storeId"));
  const file = form.get("file");
  if (!Number.isInteger(storeId) || !(file instanceof File)) return Response.json({ error: "Negocio e imagen son obligatorios." }, { status: 400 });
  if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) return Response.json({ error: "La imagen debe ser JPG, PNG o WebP de máximo 5 MB." }, { status: 400 });
  const [store] = await getDb().select({ id: stores.id, ownerId: stores.ownerId }).from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) return Response.json({ error: "Negocio no encontrado." }, { status: 404 });
  if (store.ownerId !== user.userId) return Response.json({ error: "El negocio no pertenece a esta cuenta." }, { status: 403 });
  if (!env.RECEIPTS) return Response.json({ error: "El almacenamiento multimedia no está disponible." }, { status: 503 });
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `product-images/${user.userId}/${crypto.randomUUID()}.${extension}`;
  await env.RECEIPTS.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
  return Response.json({ imageUrl: `r2://${key}` }, { status: 201 });
}
