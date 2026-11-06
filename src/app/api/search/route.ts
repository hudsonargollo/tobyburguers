import { NextResponse, type NextRequest } from "next/server";
import { searchStore } from "@/lib/catalog";
import { getSelectedBranch } from "@/lib/branch";

// Instant suggestions for the search box: the top few pieces plus how the query
// was read (category, typo fix). The full list lives on /search.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!q) return NextResponse.json({ total: 0, products: [], category: null, correction: null, partial: false });

  const r = await searchStore(q, (await getSelectedBranch())?.id);
  return NextResponse.json({
    total: r.products.length,
    partial: r.partial,
    correction: r.corrections[0]?.to ?? null,
    category: r.category && { name: r.category.name, slug: r.category.slug, count: r.category.count },
    products: r.products.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.images[0] ?? null,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      category: p.category.name,
      soldOut: p.stock <= 0,
    })),
  });
}
