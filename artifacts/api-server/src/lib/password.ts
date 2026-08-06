import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "scrypt";
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${PREFIX}:${salt}:${hash}`;
}

export function isHashedPassword(stored: string): boolean {
  return stored.startsWith(`${PREFIX}:`);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!isHashedPassword(stored)) {
    // Legacy plaintext value — compare in constant time.
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
