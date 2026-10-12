import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { balanceTransactions, sellerBalances } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function GET() {
  const seller = await getChatGPTUser();
  if (!seller) return Response.json({ error: "Inicia sesión para consultar tu balance." }, { status: 401 });
  const db = getDb();
  const [balance] = await db.select().from(sellerBalances).where(eq(sellerBalances.ownerId, seller.userId)).limit(1);
  const transactions = await db.select().from(balanceTransactions).where(eq(balanceTransactions.ownerId, seller.userId)).orderBy(desc(balanceTransactions.id)).limit(20);
  return Response.json({ balance: balance ?? { ownerId: seller.userId, availableCents: 0, totalEarnedCents: 0 }, transactions });
}
