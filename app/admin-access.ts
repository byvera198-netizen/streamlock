import { env } from "cloudflare:workers";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function configuredAdminEmails(): string[] {
  const configured = env.STREAMLOCK_ADMIN_EMAILS?.trim() || env.STREAMLOCK_ADMIN_EMAIL?.trim() || "";
  return configured
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function hasAdminConfiguration(): boolean {
  return configuredAdminEmails().length > 0;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return configuredAdminEmails().includes(normalizeEmail(email));
}

export function primaryAdminEmail(): string | null {
  return configuredAdminEmails()[0] ?? null;
}
