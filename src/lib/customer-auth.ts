import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, readToken } from "./session-token";

// Storefront customer sessions — separate cookie AND separate signing key from
// the admin session (see ./session-token).

const COOKIE = "toby_customer";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type CustomerSession = {
  id: string;
  email: string;
  name: string;
  exp: number;
};

export async function startCustomerSession(customer: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  const session: CustomerSession = {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const store = await cookies();
  store.set(COOKIE, createToken("customer", session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function endCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? readToken<CustomerSession>("customer", token) : null;
}

// Only allow same-site relative paths as a post-login destination
// (prevents open redirects like `?next=//evil.com`).
export function safeNext(value: unknown, fallback = "/account"): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  if (v.startsWith("/login") || v.startsWith("/register")) return fallback;
  return v;
}

// Guards customer-only pages — redirects to login (and back afterwards).
export async function requireCustomer(returnTo = "/account"): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(safeNext(returnTo))}`);
  return session;
}
