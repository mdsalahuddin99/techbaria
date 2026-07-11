/**
 * Password hashing utility using Node.js built-in crypto (scrypt).
 *
 * Avoids external bcrypt dependency while providing the same level of security.
 * Uses scrypt with a random salt — N=16384, r=8, p=1 (OWASP-recommended).
 *
 * Format: `scrypt:N:r:p:salt$hash` (self-describing for future algorithm migration).
 */
import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const SCRYPT_PARAMS = "16384:8:1"; // N, r, p
const KEY_LENGTH = 64; // 512-bit output
const SALT_LENGTH = 32; // 256-bit salt

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt:${SCRYPT_PARAMS}:${salt}$${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  // Format: scrypt:N:r:p:salt$hash
  const parts = hash.split("$");
  if (parts.length !== 2) return false;

  const meta = parts[0]; // "scrypt:16384:8:1:salt"
  const storedHash = parts[1];

  const metaParts = meta.split(":");
  // metaParts = ["scrypt", "16384", "8", "1", "salt"]
  if (metaParts.length !== 5 || metaParts[0] !== "scrypt") return false;

  const N = Number(metaParts[1]) || 16384;
  const r = Number(metaParts[2]) || 8;
  const p = Number(metaParts[3]) || 1;
  const salt = metaParts[4]; // hex salt — no ":" characters

  const derivedKey = scryptSync(password, salt, KEY_LENGTH, { N, r, p });
  const derivedHex = derivedKey.toString("hex");

  // Timing-safe comparison prevents timing attacks
  if (derivedHex.length !== storedHash.length) return false;
  return timingSafeEqual(Buffer.from(derivedHex), Buffer.from(storedHash));
}

export function isHashedPassword(hash: string): boolean {
  return hash.startsWith("scrypt:");
}
