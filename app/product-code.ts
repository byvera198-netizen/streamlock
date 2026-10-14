const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createPublicProductCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `SL-${Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("")}`;
}
