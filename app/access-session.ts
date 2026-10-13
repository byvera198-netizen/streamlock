import { env } from "cloudflare:workers";

export const ACCESS_SESSION_COOKIE = "streamlock_access_session";
const SESSION_TTL_SECONDS = 60 * 60;
const encoder = new TextEncoder();

export type AccessSessionUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

function base64UrlEncode(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(normalized);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sign(value: string): Promise<string | null> {
  const secret = env.ACCESS_SESSION_SECRET;
  if (!secret) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64UrlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value) as unknown as BufferSource)));
}

async function verify(value: string, signature: string): Promise<boolean> {
  const secret = env.ACCESS_SESSION_SECRET;
  if (!secret) return false;
  const provided = base64UrlDecode(signature);
  if (!provided) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, provided as unknown as BufferSource, encoder.encode(value) as unknown as BufferSource);
}

async function userIdForEmail(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(email.toLowerCase()));
  return `access:${base64UrlEncode(new Uint8Array(digest))}`;
}

export async function createAccessSessionToken(email: string, fullName: string | null): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const payload = JSON.stringify({
    userId: await userIdForEmail(normalizedEmail),
    displayName: fullName?.trim() || normalizedEmail,
    email: normalizedEmail,
    fullName: fullName?.trim() || null,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const encodedPayload = base64UrlEncode(encoder.encode(payload));
  const signature = await sign(encodedPayload);
  return signature ? `${encodedPayload}.${signature}` : null;
}

export async function readAccessSessionToken(token: string | null): Promise<AccessSessionUser | null> {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !(await verify(encodedPayload, signature))) return null;
  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decoded)) as AccessSessionUser & { exp?: number };
    if (!payload.userId || !payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.userId, displayName: payload.displayName, email: payload.email, fullName: payload.fullName ?? null };
  } catch {
    return null;
  }
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  const value = cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}
