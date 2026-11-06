import { cookies } from "next/headers";
import { createToken, readToken } from "./session-token";

// Lightweight admin auth — no external dependencies.
// Passwords: scrypt salted hashes (see ./password). Sessions: HMAC-signed cookie
// (see ./session-token — admin tokens use their own signing key).

export { hashPassword, verifyPassword } from "./password";

const SESSION_COOKIE = "toby_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
export const ADMIN_ROLES = ["ADMIN", "STAFF"];

/** `ver` = the admin row's `updatedAt` (ms) when this session signed in; a newer
 *  sign-in on the same account bumps it, which retires this session (see lib/admin).
 *  `branchId` binds STAFF sessions to one store; ADMIN sessions are global. */
export type AdminSession = { email: string; role: string; ver: number; branchId: string | null; exp: number };

// ---------- Cookie helpers (server actions / route handlers) ----------

export async function startSession(
  email: string,
  role: string,
  ver: number,
  branchId: string | null = null
): Promise<void> {
  const session: AdminSession = {
    email,
    role,
    ver,
    branchId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken("admin", session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = readToken<AdminSession>("admin", token);
  if (!session || !session.email || typeof session.ver !== "number" || !ADMIN_ROLES.includes(session.role)) return null;
  return { ...session, branchId: typeof session.branchId === "string" ? session.branchId : null };
}
