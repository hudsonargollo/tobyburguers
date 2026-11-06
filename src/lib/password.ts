import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Password hashing with scrypt (salted). Kept dependency-free and free of any
// Next.js imports so it can be used from standalone scripts (e.g. create-admin)
// as well as from the app.

// Minimum length for customer passwords (register, checkout sign-up, reset).
export { MIN_PASSWORD } from "./auth-rules";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const test = scryptSync(password, salt, 64);
  return hashBuf.length === test.length && timingSafeEqual(hashBuf, test);
}
