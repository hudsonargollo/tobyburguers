import { timingSafeEqual, createHmac } from "node:crypto";

// Shared HMAC-signed session tokens (`payload.signature`), no external dependency.
//
// Each token kind ("admin", "customer") is signed under its own derived key, so a
// token minted for one kind can never be replayed as another — e.g. a customer
// cookie pasted into the admin cookie fails verification.

export type TokenKind = "admin" | "customer" | "reset" | "verify";

const DEV_FALLBACK = "dev-secret-change-me";

function baseSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    // Fail closed: never sign or accept sessions with a guessable key in production.
    throw new Error("AUTH_SECRET must be set (16+ characters) in production.");
  }
  return secret || DEV_FALLBACK;
}

/** A key derived from AUTH_SECRET for a given purpose (e.g. hashing OTP codes). */
export function derivedKey(label: string): Buffer {
  return createHmac("sha256", baseSecret()).update(`Toby ¡Mi Hamburguesa!:${label}`).digest();
}

function sign(kind: TokenKind, payload: string): string {
  const key = createHmac("sha256", baseSecret()).update(`Toby ¡Mi Hamburguesa!:${kind}`).digest();
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createToken<T extends { exp: number }>(kind: TokenKind, session: T): string {
  const payload = Buffer.from(JSON.stringify({ ...session, kind })).toString("base64url");
  return `${payload}.${sign(kind, payload)}`;
}

export function readToken<T extends { exp: number }>(kind: TokenKind, token: string): T | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(kind, payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as T & {
      kind?: string;
    };
    if (session.kind !== kind) return null;
    if (typeof session.exp !== "number" || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}
