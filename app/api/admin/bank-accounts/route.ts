import { and, asc, count, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { bankAccounts } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function requireAdmin() {
  const user = await getChatGPTUser();
  const email = env.STREAMLOCK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return { response: Response.json({ error: "El administrador aún no está configurado." }, { status: 503 }) };
  if (!user || user.email.toLowerCase() !== email) return { response: Response.json({ error: "No autorizado." }, { status: 403 }) };
  return { user };
}

function validate(body: { slug?: string; bankName?: string; accountType?: string; accountNumber?: string }) {
  const slug = body.slug?.trim().toLowerCase() ?? "";
  const bankName = body.bankName?.trim() ?? "";
  const accountType = body.accountType?.trim() ?? "";
  const accountNumber = body.accountNumber?.trim() ?? "";
  if (!/^[a-z0-9-]{2,40}$/.test(slug) || bankName.length < 3 || bankName.length > 80 || accountType.length < 3 || accountType.length > 40 || !/^[\d\s-]{4,40}$/.test(accountNumber)) return null;
  return { slug, bankName, accountType, accountNumber };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const accounts = await getDb().select().from(bankAccounts).orderBy(asc(bankAccounts.id));
  return Response.json({ accounts });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const validated = validate(await request.json() as { slug?: string; bankName?: string; accountType?: string; accountNumber?: string });
  if (!validated) return Response.json({ error: "Revisa el identificador, banco, tipo y número de cuenta." }, { status: 400 });
  try {
    const [account] = await getDb().insert(bankAccounts).values(validated).returning();
    return Response.json({ account }, { status: 201 });
  } catch {
    return Response.json({ error: "Ya existe una cuenta con ese identificador." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const body = await request.json() as { accountId?: number; active?: boolean; bankName?: string; accountType?: string; accountNumber?: string };
  const id = Number(body.accountId);
  if (!Number.isInteger(id)) return Response.json({ error: "Cuenta inválida." }, { status: 400 });
  const db = getDb();
  const [current] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
  if (!current) return Response.json({ error: "Cuenta no encontrada." }, { status: 404 });
  if (body.active === false && current.active) {
    const [activeCount] = await db.select({ value: count() }).from(bankAccounts).where(and(eq(bankAccounts.active, true), eq(bankAccounts.id, id)));
    const [allActive] = await db.select({ value: count() }).from(bankAccounts).where(eq(bankAccounts.active, true));
    if ((allActive?.value ?? 0) <= 1 || (activeCount?.value ?? 0) === 0) return Response.json({ error: "Debe existir al menos una cuenta activa para recibir depósitos." }, { status: 409 });
  }
  const updates: Partial<typeof bankAccounts.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (typeof body.active === "boolean") updates.active = body.active;
  if (body.bankName !== undefined || body.accountType !== undefined || body.accountNumber !== undefined) {
    const validated = validate({ slug: current.slug, bankName: body.bankName ?? current.bankName, accountType: body.accountType ?? current.accountType, accountNumber: body.accountNumber ?? current.accountNumber });
    if (!validated) return Response.json({ error: "Revisa los datos de la cuenta." }, { status: 400 });
    updates.bankName = validated.bankName; updates.accountType = validated.accountType; updates.accountNumber = validated.accountNumber;
  }
  const [account] = await db.update(bankAccounts).set(updates).where(eq(bankAccounts.id, id)).returning();
  return Response.json({ account });
}
