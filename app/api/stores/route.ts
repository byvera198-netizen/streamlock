import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { stores as storesTable } from "../../../db/schema";

function slugify(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48); }

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para consultar tus negocios." }, { status: 401 });
  const ownedStores = await getDb().select().from(storesTable).where(eq(storesTable.ownerId, user.userId)).orderBy(desc(storesTable.id));
  return Response.json({ stores: ownedStores, store: ownedStores[0] ?? null });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para crear un negocio." }, { status: 401 });
  const payload = await request.json() as { name?: string; socialNetwork?: string };
  const name = payload.name?.trim() ?? "";
  const socialNetwork = payload.socialNetwork?.trim() ?? "";
  if (name.length < 3 || !socialNetwork) return Response.json({ error: "Completa el nombre y la red social principal." }, { status: 400 });
  const db = getDb();
  const ownedStore = await db.select().from(storesTable).where(eq(storesTable.ownerId, user.userId)).orderBy(desc(storesTable.id)).limit(1);
  if (ownedStore[0]) return Response.json({ store: ownedStore[0], existing: true, message: "Tu negocio ya está configurado." });
  const baseSlug = slugify(name) || "negocio";
  const existing = await db.select({ id: storesTable.id }).from(storesTable).where(eq(storesTable.slug, baseSlug)).limit(1);
  const slug = existing.length ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;
  const [store] = await db.insert(storesTable).values({ ownerId: user.userId, name, slug, socialNetwork }).returning();
  return Response.json({ store }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para actualizar tu negocio." }, { status: 401 });
  const payload = await request.json() as { name?: string; socialNetwork?: string };
  const name = payload.name?.trim() ?? "";
  const socialNetwork = payload.socialNetwork?.trim() ?? "";
  if (name.length < 3 || !socialNetwork) return Response.json({ error: "Completa el nombre y la red social principal." }, { status: 400 });
  const db = getDb();
  const [store] = await db.select({ id: storesTable.id }).from(storesTable).where(eq(storesTable.ownerId, user.userId)).orderBy(desc(storesTable.id)).limit(1);
  if (!store) return Response.json({ error: "Primero crea tu negocio." }, { status: 404 });
  const [updated] = await db.update(storesTable).set({ name, socialNetwork }).where(eq(storesTable.id, store.id)).returning();
  return Response.json({ store: updated });
}
