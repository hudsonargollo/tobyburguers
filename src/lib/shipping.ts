// Default shipping policy — the starting values for Admin → Settings
// (the live rules come from getStoreSettings; see settings-shared.ts).
// Local delivery: free from the threshold, otherwise a flat fee in Bs.
// Override via NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD / NEXT_PUBLIC_FLAT_SHIPPING.
function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const FREE_SHIPPING_THRESHOLD = num(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD, 0);
export const FLAT_SHIPPING = num(process.env.NEXT_PUBLIC_FLAT_SHIPPING, 15);

/** Delivery estimate, not a guarantee, shown across the site (product page, FAQ, shipping, chat). */
export const DELIVERY_TIME = "lo antes posible, según preparación y distancia";
