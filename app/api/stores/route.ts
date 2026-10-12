import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { stores } from "../../../db/schema";

function slugify(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48); }

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para crear un negocio." }, { status: 401 });
  const payload = await request.json() as { name?: string; socialNetwork?: string };
  const name = payload.name?.trim() ?? "";
  const socialNetwork = payload.socialNetwork?.trim() ?? "";
  if (name.length < 3 || !socialNetwork) return Response.json({ error: "Completa el nombre y la red social principal." }, { status: 400 });
  const db = getDb();
  const baseSlug = slugify(name) || "negocio";
  const existing = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, baseSlug)).limit(1);
  const slug = existing.length ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;
  const [store] = await db.insert(stores).values({ ownerId: user.userId, name, slug, socialNetwork }).returning();
  return Response.json({ store }, { status: 201 });
}
