import { notifications } from "./schema";
import type { getDb } from "./index";

export async function createNotification(db: ReturnType<typeof getDb>, values: { userId: string; type: string; title: string; message: string; orderId?: number }) {
  await db.insert(notifications).values({ ...values, orderId: values.orderId ?? null });
}
