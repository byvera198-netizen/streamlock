import { notifications } from "./schema";

export async function createNotification(db: any, values: { userId: string; type: string; title: string; message: string; orderId?: number }) {
  await db.insert(notifications).values({ ...values, orderId: values.orderId ?? null });
}
