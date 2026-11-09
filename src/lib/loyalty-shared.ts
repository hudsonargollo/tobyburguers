// Pure loyalty rules — client-safe (no Prisma, no server imports) so the
// checkout form, the Club page and the admin preview all compute the same
// numbers from the same stored settings.
//
// Two currencies, both stored as signed deltas in an append-only ledger:
//  · stamps → belong to one product; a full card redeems that same product.
//  · points → pooled; spent in the rewards shop.

import type { LoyaltySettings } from "./settings-shared";

/** What the rules need to know about one cart line. */
export type LoyaltyLine = {
  productId: string;
  productSlug: string;
  categorySlug: string;
  quantity: number;
};

export function stampEligible(
  line: Pick<LoyaltyLine, "productSlug" | "categorySlug">,
  rules: LoyaltySettings
): boolean {
  if (!rules.enabled) return false;
  if (rules.eligible === "all") return true;
  const slug = rules.eligible === "category" ? line.categorySlug : line.productSlug;
  return rules.eligibleSlugs.includes(slug);
}

/**
 * Stamps a line earns: one per unit, but never past a full card — an
 * 11th stamp would otherwise be thrown away on the next purchase.
 */
export function stampsForLine(
  line: Pick<LoyaltyLine, "quantity">,
  rules: LoyaltySettings,
  ownedForProduct: number
): number {
  const remaining = Math.max(0, rules.stampsToFree - ownedForProduct);
  return Math.min(line.quantity, remaining);
}

/** Bs spent × points rate. Only counts delivery when the owner opted in. */
export function pointsForOrder(
  amounts: { subtotal: number; shipping: number },
  rules: LoyaltySettings
): number {
  if (!rules.enabled || rules.pointsAmount <= 0 || rules.pointsPer <= 0) return 0;
  const spend = amounts.subtotal + (rules.pointsOnShipping ? amounts.shipping : 0);
  return Math.floor(spend / rules.pointsAmount) * rules.pointsPer;
}

export type StampCard = {
  size: number;
  filled: number;
  remaining: number;
  full: boolean;
};

export function stampCard(owned: number, rules: LoyaltySettings): StampCard {
  // The card size follows the current rule even if a card was filled under an
  // older, bigger one — the stamps stay valid, they just need fewer to redeem.
  const size = Math.max(1, rules.stampsToFree);
  const filled = Math.min(Math.max(0, owned), size);
  return { size, filled, remaining: Math.max(0, size - owned), full: owned >= size };
}

/** Whole-line preview used by the checkout UI and by the accrual itself. */
export function previewLoyalty(
  lines: LoyaltyLine[],
  amounts: { subtotal: number; shipping: number },
  rules: LoyaltySettings,
  ownedStamps: Record<string, number> = {}
): { stampsByProduct: Record<string, number>; stamps: number; points: number } {
  const stampsByProduct: Record<string, number> = {};
  let stamps = 0;
  if (rules.enabled) {
    const earned: Record<string, number> = {};
    for (const line of lines) {
      if (!stampEligible(line, rules)) continue;
      // Multiple lines can point at the same product; cap on the running total.
      const pool = (ownedStamps[line.productId] ?? 0) + (earned[line.productId] ?? 0);
      const got = stampsForLine(line, rules, pool);
      if (got > 0) {
        earned[line.productId] = (earned[line.productId] ?? 0) + got;
        stamps += got;
      }
    }
    for (const [id, n] of Object.entries(earned)) if (n > 0) stampsByProduct[id] = n;
  }
  return { stampsByProduct, stamps, points: pointsForOrder(amounts, rules) };
}

/** What the cart on screen means for the programme (checkout preview payload). */
export type LoyaltyCartPreview = {
  ok: true;
  enabled: boolean;
  name: string;
  stampsToFree: number;
  points: number;
  stamps: number;
  balance: { points: number; stamps: number };
  cards: { productId: string; name: string; filled: number; size: number }[];
  redeemable: { productId: string; name: string; price: number }[];
};

/** "10 sellos = 1 gratis" phrasing used across the store. */
export function stampRuleLabel(rules: LoyaltySettings): string {
  const n = rules.stampsToFree;
  return `${n === 1 ? "1 sello" : `${n} sellos`} = 1 producto gratis`;
}

export function pointRuleLabel(rules: LoyaltySettings): string {
  const bs = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(rules.pointsAmount);
  const pts = rules.pointsPer === 1 ? "1 punto" : `${rules.pointsPer} puntos`;
  return `${pts} por cada Bs ${bs} de compra`;
}

/** Spanish label for one ledger entry; used by the club page and the admin panel. */
export function movementLabel(h: {
  kind: string;
  product: { name: string } | null;
  reward: { name: string } | null;
  order: { orderNumber: string } | null;
  note: string | null;
}): string {
  switch (h.kind) {
    case "STAMP":
      return `Pedido ${h.order?.orderNumber ?? ""} — ${h.product?.name ?? "producto"}`;
    case "POINT":
      return `Compra ${h.order?.orderNumber ?? ""}`;
    case "REDEEM_STAMP":
      return `Canje de ${h.product?.name ?? "un producto"} gratis`;
    case "REDEEM_PRIZE":
      return `Regalo canjeado: ${h.reward?.name ?? ""}`;
    case "REFUND":
      return `Pedido cancelado ${h.order?.orderNumber ?? ""}`;
    default:
      return h.note ?? "Ajuste";
  }
}

