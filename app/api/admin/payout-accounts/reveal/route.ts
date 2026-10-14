import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { payoutAccounts } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { recordAuditEvent } from "../../../../security-guard";
import { decryptSensitiveValue } from "../../../../secure-data";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const adminEmail = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !user || user.email.toLowerCase() !== adminEmail) return Response.json({ error: "No autorizado." }, { status: 403 });
  const body = await request.json() as { accountId?: number; reason?: string };
  const accountId = Number(body.accountId);
  const reason = body.reason?.trim().replace(/\s+/g, " ") ?? "";
  if (!Number.isInteger(accountId) || reason.length < 8 || reason.length > 240) return Response.json({ error: "Indica una razón de al menos 8 caracteres para revelar la cuenta." }, { status: 400 });
  const [account] = await getDb().select().from(payoutAccounts).where(eq(payoutAccounts.id, accountId)).limit(1);
  if (!account) return Response.json({ error: "Cuenta no encontrada." }, { status: 404 });
  let accountNumber: string;
  try {
    accountNumber = await decryptSensitiveValue(account.accountNumberCiphertext);
  } catch {
    return Response.json({ error: "No se pudo descifrar la cuenta registrada." }, { status: 500 });
  }
  await recordAuditEvent({ actorId: user.userId, action: "admin_payout_account_number_reveal", targetType: "payout_account", targetId: accountId, metadata: { reason, status: account.status, bankName: account.bankName, last4: account.accountNumberLast4 } });
  return Response.json({ accountId, bankName: account.bankName, accountType: account.accountType, accountHolderName: account.accountHolderName, accountNumber }, { headers: { "Cache-Control": "private, no-store", "Pragma": "no-cache" } });
}
