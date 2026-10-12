import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { notificationPreferences, notifications } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para ver tus notificaciones." }, { status: 401 });
  const db = getDb();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.userId)).orderBy(desc(notifications.id)).limit(30);
  let [preferences] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, user.userId)).limit(1);
  if (!preferences) {
    [preferences] = await db.insert(notificationPreferences).values({ userId: user.userId }).returning();
  }
  return Response.json({ notifications: rows, unread: rows.filter((row) => !row.readAt).length, preferences });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para actualizar tus notificaciones." }, { status: 401 });
  const body = await request.json() as { notificationId?: number; preferences?: Partial<Record<"inApp" | "email" | "whatsapp" | "sms", boolean>> };
  const db = getDb();
  if (body.preferences) {
    const values = { ...body.preferences, updatedAt: new Date().toISOString() };
    await db.insert(notificationPreferences).values({ userId: user.userId, ...values }).onConflictDoUpdate({ target: notificationPreferences.userId, set: values });
    const [preferences] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, user.userId)).limit(1);
    return Response.json({ ok: true, preferences });
  }
  const id = Number(body.notificationId);
  if (!Number.isInteger(id)) return Response.json({ error: "Notificación inválida." }, { status: 400 });
  await db.update(notifications).set({ readAt: new Date().toISOString() }).where(and(eq(notifications.id, id), eq(notifications.userId, user.userId)));
  return Response.json({ ok: true });
}
