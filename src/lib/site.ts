// Canonical public origin of the store (no trailing slash). Used for metadata,
// sitemap, JSON-LD and payment-gateway return URLs — never derive these from the
// incoming request's Host header, which the client controls.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
