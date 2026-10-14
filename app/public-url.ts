import { env } from "cloudflare:workers";

const fallbackUrl = "https://streamlock.profebyron.workers.dev";

export function getPublicUrl() {
  const candidate = (env as unknown as { STREAMLOCK_PUBLIC_URL?: string }).STREAMLOCK_PUBLIC_URL?.trim();
  if (!candidate) return fallbackUrl;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallbackUrl;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return fallbackUrl;
  }
}
