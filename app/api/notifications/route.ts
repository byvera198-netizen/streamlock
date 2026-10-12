import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { notifications } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para ver tus notificaciones." }, { status: 401 });
  const rows = await getDb().select().from(notifications).where(eq(notifications.userId, user.userId)).orderBy(desc(notifications.id)).limit(30);
  return Response.json({ notifications: rows, unread: rows.filter((row) => !row.readAt).length });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para actualizar tus notificaciones." }, { status: 401 });
  const body = await request.json() as { notificationId?: number };
  const id = Number(body.notificationId);
  if (!Number.isInteger(id)) return Response.json({ error: "Notificación inválida." }, { status: 400 });
  await getDb().update(notifications).set({ readAt: new Date().toISOString() }).where(and(eq(notifications.id, id), eq(notifications.userId, user.userId)));
  return Response.json({ ok: true });
}
