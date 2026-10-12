import { and, eq, sql } from "drizzle-orm";
import type { getDb } from "./index";
import { balanceTransactions, escrowLedger, sellerBalances } from "./schema";

export async function creditSellerBalance(db: ReturnType<typeof getDb>, ownerId: string, orderId: number, amountCents: number, feeCents: number) {
  const [escrow] = await db.select().from(escrowLedger).where(and(eq(escrowLedger.orderId, orderId), eq(escrowLedger.status, "released"))).limit(1);
  if (!escrow) return;
  const [alreadyCredited] = await db.select({ id: balanceTransactions.id }).from(balanceTransactions)
    .where(and(eq(balanceTransactions.ownerId, ownerId), eq(balanceTransactions.orderId, orderId), eq(balanceTransactions.type, "sale_released"))).limit(1);
  if (alreadyCredited) return;
  const now = new Date().toISOString();
  await db.insert(sellerBalances).values({ ownerId, availableCents: amountCents, totalEarnedCents: amountCents, updatedAt: now }).onConflictDoUpdate({
    target: sellerBalances.ownerId,
    set: {
      availableCents: sql`${sellerBalances.availableCents} + ${amountCents}`,
      totalEarnedCents: sql`${sellerBalances.totalEarnedCents} + ${amountCents}`,
      updatedAt: now,
    },
  });
  await db.insert(balanceTransactions).values({ ownerId, orderId, type: "sale_released", amountCents, feeCents });
}
