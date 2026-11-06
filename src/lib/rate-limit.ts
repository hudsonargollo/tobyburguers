import { headers } from "next/headers";

// Minimal fixed-window rate limiter (in-memory, per process). Good enough for the
// single-instance VPS deployment this store targets; swap for Redis if the app is
// ever scaled to multiple instances.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip"))?.trim() || "unknown";
}

// Returns true when the action is allowed, false when the limit is exceeded.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export const TOO_MANY = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
