import { and, eq } from "drizzle-orm";
import { balanceTransactions, escrowLedger, sellerBalances } from "./schema";

export async function creditSellerBalance(db: any, ownerId: string, orderId: number, amountCents: number, feeCents: number) {
  const [escrow] = await db.select().from(escrowLedger).where(and(eq(escrowLedger.orderId, orderId), eq(escrowLedger.status, "released"))).limit(1);
  if (!escrow) return;
  const [current] = await db.select().from(sellerBalances).where(eq(sellerBalances.ownerId, ownerId)).limit(1);
  if (current) {
    await db.update(sellerBalances).set({ availableCents: current.availableCents + amountCents, totalEarnedCents: current.totalEarnedCents + amountCents, updatedAt: new Date().toISOString() }).where(eq(sellerBalances.ownerId, ownerId));
  } else {
    await db.insert(sellerBalances).values({ ownerId, availableCents: amountCents, totalEarnedCents: amountCents, updatedAt: new Date().toISOString() });
  }
  await db.insert(balanceTransactions).values({ ownerId, orderId, type: "sale_released", amountCents, feeCents });
}
