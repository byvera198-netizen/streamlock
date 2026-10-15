import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { userProfiles } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { isAdminEmail } from "../../../../admin-access";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !isAdminEmail(user.email)) return Response.json({ error: "No autorizado." }, { status: 403 });
  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  if (!userId) return Response.json({ error: "Perfil inválido." }, { status: 400 });
  const [profile] = await getDb().select({ identityDocumentKey: userProfiles.identityDocumentKey, identityDocumentType: userProfiles.identityDocumentType })
    .from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!profile?.identityDocumentKey || !env.RECEIPTS) return Response.json({ error: "Documento no encontrado." }, { status: 404 });
  const object = await env.RECEIPTS.get(profile.identityDocumentKey);
  if (!object) return Response.json({ error: "Documento no encontrado." }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? profile.identityDocumentType ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
