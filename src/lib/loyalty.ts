import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { LoyaltySettings } from "./settings-shared";
import { previewLoyalty, stampCard, type LoyaltyLine } from "./loyalty-shared";

// Server side of Club Toby. The ledger (LoyaltyEntry) is append-only and holds
// signed deltas, so a balance is always the sum of its rows: earning, spending,
// refunds and manual corrections are all just new rows. Nothing is ever
// rewritten, which keeps customer disputes answerable.

export type LoyaltyBalances = {
  /** Pooled points available for the rewards shop. */
  points: number;
  /** Stamps per product id — each product carries its own card. */
  stampsByProduct: Record<string, number>;
  /** Products whose card is currently full. */
  readyForRedemption: string[];
  totalStamps: number;
};

/** A spend the customer isn't entitled to — safe to show verbatim. */
class LoyaltySpendError extends Error {}

/** Rows older than the expiry window are ignored (never deleted). */
function withinWindow(createdAt: Date, expiryDays: number, now: number): boolean {
  if (!expiryDays || expiryDays <= 0) return true;
  return now - createdAt.getTime() <= expiryDays * 86_400_000;
}

export async function getBalances(
  customerId: string,
  rules: LoyaltySettings
): Promise<LoyaltyBalances> {
  const rows = await prisma.loyaltyEntry.findMany({
    where: { customerId },
    select: { stamps: true, points: true, productId: true, createdAt: true },
  });
  const now = Date.now();
  const stampsByProduct: Record<string, number> = {};
  let points = 0;
  let totalStamps = 0;
  for (const r of rows) {
    if (!withinWindow(r.createdAt, rules.expiryDays, now)) continue;
    if (r.points) points += r.points;
    if (r.stamps) {
      totalStamps += r.stamps;
      const key = r.productId ?? "";
      stampsByProduct[key] = (stampsByProduct[key] ?? 0) + r.stamps;
    }
  }
  const full = Math.max(1, rules.stampsToFree);
  const readyForRedemption = Object.entries(stampsByProduct)
    .filter(([id, n]) => id !== "" && n >= full)
    .map(([id]) => id);
  return { points, stampsByProduct, readyForRedemption, totalStamps };
}

/** The signed sum of a customer's rows for one kind — used to guard spends. */
async function balanceOf(
  tx: Prisma.TransactionClient,
  customerId: string,
  field: "points" | "stamps",
  productId?: string
): Promise<number> {
  const res = await tx.loyaltyEntry.aggregate({
    where: { customerId, ...(productId ? { productId } : {}) },
    _sum: { [field]: true },
  });
  return res._sum[field] ?? 0;
}

/**
 * Adds the stamps + points one order earned. Called inside the checkout
 * transaction, after the order row exists, so a rolled back order never pays out.
 */
export async function accrueOrder(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    customerId: string;
    lines: LoyaltyLine[];
    amounts: { subtotal: number; shipping: number };
    rules: LoyaltySettings;
    ownedStamps: Record<string, number>;
  }
): Promise<{ stamps: number; points: number }> {
  const preview = previewLoyalty(input.lines, input.amounts, input.rules, input.ownedStamps);
  for (const [productId, stamps] of Object.entries(preview.stampsByProduct)) {
    await tx.loyaltyEntry.create({
      data: {
        customerId: input.customerId,
        orderId: input.orderId,
        productId,
        kind: "STAMP",
        stamps,
      },
    });
  }
  if (preview.points > 0) {
    await tx.loyaltyEntry.create({
      data: {
        customerId: input.customerId,
        orderId: input.orderId,
        kind: "POINT",
        points: preview.points,
      },
    });
  }
  return { stamps: preview.stamps, points: preview.points };
}

/**
 * Spends a full card for one product. Throws if the card isn't full — the
 * caller must also make the matching unit free on the order.
 */
export async function redeemStamps(
  tx: Prisma.TransactionClient,
  input: { customerId: string; productId: string; orderId?: string; rules: LoyaltySettings }
): Promise<void> {
  const owned = await balanceOf(tx, input.customerId, "stamps", input.productId);
  const card = stampCard(owned, input.rules);
  if (!card.full)
    throw new LoyaltySpendError(
      `Te faltan ${card.remaining} sellos para canjear este producto.`
    );
  await tx.loyaltyEntry.create({
    data: {
      customerId: input.customerId,
      productId: input.productId,
      orderId: input.orderId,
      kind: "REDEEM_STAMP",
      stamps: -input.rules.stampsToFree,
    },
  });
}

// Redemption codes are handed to the branch at pickup, so they stay short and
// unreadable-by-accident (same no-0/O/1/I/L alphabet as order numbers).
const REDEEM_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateRedemptionCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += REDEEM_ALPHABET[randomInt(REDEEM_ALPHABET.length)];
  return code;
}

export type RedeemResult = { ok: true; code: string } | { ok: false; error: string };

/** Buys a rewards-shop prize with points. One unit per call. */
export async function redeemReward(input: {
  customerId: string;
  rewardId: string;
  branchId?: string | null;
  rules: LoyaltySettings;
}): Promise<RedeemResult> {
  if (!input.rules.enabled) return { ok: false, error: "El programa de puntos está pausado." };
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = generateRedemptionCode();
    try {
      return await prisma.$transaction(async (tx) => {
        const reward = await tx.reward.findFirst({
          where: { id: input.rewardId, active: true },
          select: { id: true, name: true, costPoints: true, stock: true },
        });
        if (!reward) return { ok: false, error: "Este regalo ya no está disponible." };
        if (reward.stock <= 0)
          return { ok: false, error: `"${reward.name}" está agotado por ahora.` };

        // Conditional decrement, same trick as branch stock: two taps can't
        // spend the same points twice.
        await tx.loyaltyEntry.create({
          data: {
            customerId: input.customerId,
            rewardId: reward.id,
            kind: "REDEEM_PRIZE",
            points: -reward.costPoints,
          },
        });
        const balance = await balanceOf(tx, input.customerId, "points");
        if (balance < 0) throw new LoyaltySpendError("No te alcanzan los puntos para este regalo.");
        const stock = await tx.reward.updateMany({
          where: { id: reward.id, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (stock.count !== 1) throw new LoyaltySpendError(`"${reward.name}" está agotado por ahora.`);

        await tx.redemption.create({
          data: {
            code,
            customerId: input.customerId,
            rewardId: reward.id,
            rewardName: reward.name,
            costPoints: reward.costPoints,
            branchId: input.branchId ?? null,
          },
        });
        return { ok: true as const, code };
      });
    } catch (err) {
      if (err instanceof LoyaltySpendError) return { ok: false, error: err.message };
      const msg = err instanceof Error ? err.message : "";
      // Only a code collision is worth retrying; anything else is a real failure.
      if (/P2002|Unique constraint/i.test(msg) && /code/.test(msg)) continue;
      console.error("[loyalty] reward redemption failed:", err);
      return { ok: false, error: "No pudimos registrar el canje. Inténtalo de nuevo." };
    }
  }
  return { ok: false, error: "No pudimos registrar el canje. Inténtalo de nuevo." };
}

/**
 * Reverses everything an order earned (cancelled/refunded orders). Idempotent:
 * a second call for the same order writes nothing. A card spent on that order's
 * free product comes back too.
 */
export async function refundOrderLoyalty(orderId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const earned = await tx.loyaltyEntry.findMany({
      where: { orderId, kind: { in: ["STAMP", "POINT", "REDEEM_STAMP"] } },
      select: { customerId: true, productId: true, kind: true, stamps: true, points: true },
    });
    if (earned.length === 0) return false;
    const already = await tx.loyaltyEntry.count({ where: { orderId, kind: "REFUND" } });
    if (already > 0) return false;
    for (const e of earned) {
      await tx.loyaltyEntry.create({
        data: {
          customerId: e.customerId,
          productId: e.productId,
          orderId,
          kind: "REFUND",
          stamps: -e.stamps,
          points: -e.points,
        },
      });
    }
    return true;
  });
}

/** Admin correction: credit or debit either currency with a note. */
export async function adjustBalance(input: {
  customerId: string;
  stamps?: number;
  points?: number;
  productId?: string | null;
  note: string;
}): Promise<void> {
  const stamps = Math.trunc(input.stamps ?? 0);
  const points = Math.trunc(input.points ?? 0);
  if (stamps === 0 && points === 0) return;
  await prisma.loyaltyEntry.create({
    data: {
      customerId: input.customerId,
      productId: input.productId ?? null,
      kind: "ADJUST",
      stamps,
      points,
      note: input.note.trim() || "Ajuste manual",
    },
  });
}

/** What one order moved on the ledger, for the confirmation screen. */
export async function orderLoyalty(
  orderId: string
): Promise<{ stamps: number; points: number; redeemed: boolean }> {
  try {
    const rows = await prisma.loyaltyEntry.findMany({
      where: { orderId },
      select: { kind: true, stamps: true, points: true },
    });
    let stamps = 0;
    let points = 0;
    let redeemed = false;
    for (const r of rows) {
      if (r.kind === "STAMP") stamps += r.stamps;
      else if (r.kind === "POINT") points += r.points;
      else if (r.kind === "REDEEM_STAMP") redeemed = true;
    }
    return { stamps, points, redeemed };
  } catch {
    return { stamps: 0, points: 0, redeemed: false };
  }
}

/** Ledger newest-first, with the names the customer needs to recognise rows. */
export async function getHistory(customerId: string, take = 30) {
  return prisma.loyaltyEntry.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      kind: true,
      stamps: true,
      points: true,
      note: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
      reward: { select: { name: true } },
      order: { select: { orderNumber: true } },
    },
  });
}
