import { env } from "cloudflare:workers";

function getKeyBytes() {
  const configured = env.KYC_DATA_ENCRYPTION_KEY?.trim();
  if (!configured) throw new Error("KYC_DATA_ENCRYPTION_KEY is not configured");
  const normalized = configured.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("KYC_DATA_ENCRYPTION_KEY must decode to 32 bytes");
  return bytes;
}

export async function encryptSensitiveValue(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", getKeyBytes(), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  const encode = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return `${encode(iv)}.${encode(ciphertext)}`;
}

export async function decryptSensitiveValue(value: string) {
  const [encodedIv, encodedCiphertext] = value.split(".");
  if (!encodedIv || !encodedCiphertext) throw new Error("Invalid encrypted value");
  const decode = (encoded: string) => {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  };
  const key = await crypto.subtle.importKey("raw", getKeyBytes(), { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(encodedIv) }, key, decode(encodedCiphertext));
  return new TextDecoder().decode(plaintext);
}
