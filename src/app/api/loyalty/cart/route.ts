import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { getCustomerSession } from "@/lib/customer-auth";
import { getBalances } from "@/lib/loyalty";
import {
  previewLoyalty,
  stampCard,
  type LoyaltyCartPreview,
  type LoyaltyLine,
} from "@/lib/loyalty-shared";

const body = z.object({
  items: z
    .array(z.object({ productId: z.string().max(100), quantity: z.number().int().positive().max(99) }))
    .max(50)
    .default([]),
  subtotal: z.number().nonnegative().max(1_000_000).default(0),
  shipping: z.number().nonnegative().max(10_000).default(0),
  /** Product whose card the shopper intends to spend on this order. */
  redeemProductId: z.string().max(100).nullish(),
});

// What the cart on screen means for Club Toby. The same pure rules run at
// submit time inside the order transaction, so the preview is never a promise
// the checkout can't keep.
export async function POST(request: Request): Promise<NextResponse> {
  const rules = (await getStoreSettings()).loyalty;
  const empty: LoyaltyCartPreview = {
    ok: true,
    enabled: rules.enabled,
    name: rules.name,
    stampsToFree: rules.stampsToFree,
    points: 0,
    stamps: 0,
    balance: { points: 0, stamps: 0 },
    cards: [],
    redeemable: [],
  };
  if (!rules.enabled) return NextResponse.json(empty);

  const session = await getCustomerSession();
  if (!session) return NextResponse.json(empty);

  let parsed: z.infer<typeof body>;
  try {
    parsed = body.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }
  const ids = [...new Set(parsed.items.map((i) => i.productId))];
  if (ids.length === 0) return NextResponse.json(empty);

  try {
    const [products, balances] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: ids }, active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          category: { select: { slug: true } },
        },
      }),
      getBalances(session.id, rules),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));

    // Merge duplicate lines, then drop anything that is no longer sold.
    const qtyById = new Map<string, number>();
    for (const i of parsed.items)
      qtyById.set(i.productId, Math.min(99, (qtyById.get(i.productId) ?? 0) + i.quantity));

    const lines: LoyaltyLine[] = [...qtyById].flatMap(([productId, quantity]) => {
      const p = byId.get(productId);
      if (!p) return [];
      return [
        {
          productId,
          productSlug: p.slug,
          categorySlug: p.category.slug,
          quantity,
        },
      ];
    });

    // Spending a card frees the same space for the new stamps, so the preview
    // has to subtract it before counting — exactly like the checkout does.
    const owned: Record<string, number> = { ...balances.stampsByProduct };
    const redeemId = parsed.redeemProductId;
    if (redeemId && (owned[redeemId] ?? 0) >= rules.stampsToFree)
      owned[redeemId] = owned[redeemId] - rules.stampsToFree;

    const preview = previewLoyalty(
      lines,
      { subtotal: parsed.subtotal, shipping: parsed.shipping },
      rules,
      owned
    );

    return NextResponse.json({
      ...empty,
      points: preview.points,
      stamps: preview.stamps,
      balance: { points: balances.points, stamps: balances.totalStamps },
      cards: lines.map((l) => {
        const card = stampCard(balances.stampsByProduct[l.productId] ?? 0, rules);
        return {
          productId: l.productId,
          name: byId.get(l.productId)?.name ?? "",
          filled: card.filled,
          size: card.size,
        };
      }),
      redeemable: lines
        .filter((l) => (balances.stampsByProduct[l.productId] ?? 0) >= rules.stampsToFree)
        .map((l) => ({
          productId: l.productId,
          name: byId.get(l.productId)?.name ?? "",
          price: Number(byId.get(l.productId)?.price ?? 0),
        })),
    } satisfies LoyaltyCartPreview);
  } catch (err) {
    console.error("[loyalty] cart preview failed:", err);
    // The checkout must never break because the rewards preview did.
    return NextResponse.json(empty, { status: 503 });
  }
}
