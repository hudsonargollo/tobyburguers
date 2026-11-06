import { NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/catalog";
import { getSelectedBranch } from "@/lib/branch";

// Returns current name / price / compare-at price / stock for the products in a shopper's cart so
// the client can refresh its localStorage snapshot. Stock is the selected
// branch's stock. Inactive or deleted products are simply omitted (the cart
// drops them).
export async function POST(request: Request) {
  let ids: string[] = [];
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((x): x is string => typeof x === "string").slice(0, 50);
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ ok: true, products: [] });

  try {
    const branch = await getSelectedBranch();
    const rows = await getProductsByIds(ids, branch?.id);
    return NextResponse.json({
      ok: true,
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock,
      })),
    });
  } catch {
    // DB not connected (preview mode) — tell the client not to touch the cart.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
