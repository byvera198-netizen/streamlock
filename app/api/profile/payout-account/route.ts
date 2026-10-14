import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { payoutAccounts, userProfiles } from "../../../../db/schema";
import { encryptSensitiveValue } from "../../../secure-data";

function safeAccount(account: typeof payoutAccounts.$inferSelect) {
  return {
    id: account.id,
    bankName: account.bankName,
    accountType: account.accountType,
    accountHolderName: account.accountHolderName,
    accountNumberLast4: account.accountNumberLast4,
    status: account.status,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para consultar tus datos bancarios." }, { status: 401 });
  const accounts = await getDb().select().from(payoutAccounts).where(eq(payoutAccounts.ownerId, user.userId)).orderBy(desc(payoutAccounts.id));
  return Response.json({ accounts: accounts.map(safeAccount) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Inicia sesión para registrar tus datos bancarios." }, { status: 401 });
  const body = await request.json() as { bankName?: string; accountType?: string; accountHolderName?: string; accountNumber?: string };
  const bankName = body.bankName?.trim().replace(/\s+/g, " ") ?? "";
  const accountType = body.accountType?.trim().replace(/\s+/g, " ") ?? "";
  const accountHolderName = body.accountHolderName?.trim().replace(/\s+/g, " ") ?? "";
  const accountNumber = body.accountNumber?.replace(/[^0-9A-Za-z]/g, "").toUpperCase() ?? "";
  if (bankName.length < 3 || accountType.length < 3 || accountHolderName.length < 5 || accountNumber.length < 6 || accountNumber.length > 40) {
    return Response.json({ error: "Completa banco, tipo de cuenta, titular y número de cuenta válido." }, { status: 400 });
  }
  const db = getDb();
  const [profile] = await db.select({ userId: userProfiles.userId }).from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  if (!profile) return Response.json({ error: "Primero completa tu perfil de identidad." }, { status: 409 });
  let accountNumberCiphertext: string;
  try {
    accountNumberCiphertext = await encryptSensitiveValue(accountNumber);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("KYC_DATA_ENCRYPTION_KEY")) return Response.json({ error: "El registro bancario protegido aún no está configurado." }, { status: 503 });
    return Response.json({ error: "No se pudo proteger el número de cuenta." }, { status: 500 });
  }
  const [account] = await db.insert(payoutAccounts).values({ ownerId: user.userId, bankName, accountType, accountHolderName, accountNumberCiphertext, accountNumberLast4: accountNumber.slice(-4), status: "pending_review" }).returning();
  return Response.json({ account: safeAccount(account), message: "Cuenta registrada de forma protegida y pendiente de revisión administrativa." }, { status: 201 });
}
