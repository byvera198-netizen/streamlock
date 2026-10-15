import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { payoutAccounts, withdrawals } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { hasAdminConfiguration, isAdminEmail } from "../../../../admin-access";

type AuditRow = {
  id: number;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: string | null;
  created_at: string;
};

async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!hasAdminConfiguration()) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || !isAdminEmail(user.email)) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;

  const db = getDb();
  const items = await db
    .select({
      id: withdrawals.id,
      ownerId: withdrawals.ownerId,
      payoutAccountId: withdrawals.payoutAccountId,
      amountCents: withdrawals.amountCents,
      method: withdrawals.method,
      destination: withdrawals.destination,
      transferReference: withdrawals.transferReference,
      hasTransferProof: withdrawals.transferProofKey,
      status: withdrawals.status,
      reviewedAt: withdrawals.reviewedAt,
      createdAt: withdrawals.createdAt,
      payoutBankName: payoutAccounts.bankName,
      payoutAccountLast4: payoutAccounts.accountNumberLast4,
    })
    .from(withdrawals)
    .leftJoin(payoutAccounts, eq(withdrawals.payoutAccountId, payoutAccounts.id))
    .orderBy(desc(withdrawals.id))
    .limit(50);

  const auditRows = await db.all<AuditRow>(sql`
    SELECT id, actor_id, action, target_type, target_id, metadata, created_at
    FROM security_audit_events
    WHERE action = 'admin_withdrawal_review'
    ORDER BY id DESC
    LIMIT 100
  `);

  return Response.json({
    withdrawals: items.map(({ hasTransferProof, ...item }) => ({ ...item, hasTransferProof: Boolean(hasTransferProof) })),
    audit: auditRows.map((row) => {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
      } catch {
        metadata = {};
      }
      return {
        id: row.id,
        actorId: row.actor_id,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        decision: typeof metadata.decision === "string" ? metadata.decision : null,
        transferReference: typeof metadata.transferReference === "string" ? metadata.transferReference : null,
        hasTransferProof: metadata.hasTransferProof === true,
        amountCents: typeof metadata.amountCents === "number" ? metadata.amountCents : null,
        createdAt: row.created_at,
      };
    }),
  });
}
