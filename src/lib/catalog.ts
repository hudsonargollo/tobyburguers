import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { sampleCategories, sampleProducts } from "./sample-data";
import { searchCatalog, type SearchCategory, type SearchResult } from "./search-engine";
import { CATALOG_TAG } from "./cache-tags";
import type { CategoryView, ProductView, ProductFilters, ShopFacets } from "./types";

// The storefront reads through these functions. The active catalog is one
// cached snapshot (product + per-branch stock rows, shared across requests and
// refreshed whenever the admin edits a product, a branch's stock, or an order
// changes stock — see lib/cache-tags). Filters, facets and search are worked out
// in memory. Availability is resolved for the branch the shopper picked; with
// no branch selected it shows the chain-wide total so browsing still works.
// Without a database the bundled sample data is served so the UI stays previewable.

let warned = false;
function warnFallback(err: unknown) {
  // In production this means the live DB is unreachable — log every time so it
  // shows up in the host's function logs instead of silently serving samples.
  if (process.env.NODE_ENV === "production") {
    console.error("[catalog] DATABASE UNAVAILABLE — serving sample data:", err);
    return;
  }
  if (!warned) {
    warned = true;
    console.warn(
      "[catalog] Database unavailable — serving sample data. Connect DATABASE_URL and run `npx prisma migrate dev` + `npm run db:seed` to go live.",
      err instanceof Error ? err.message : err
    );
  }
}

type SnapshotProduct = Omit<ProductView, "stock"> & {
  stockByBranch: Record<string, number>;
  totalStock: number;
};

type Snapshot = { products: SnapshotProduct[]; categories: CategoryView[] };

// Cross-request cache (5 min safety net; normally refreshed by tag).
const loadSnapshot = unstable_cache(
  async (): Promise<Snapshot> => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        include: {
          category: { select: { name: true, slug: true } },
          branchStock: { select: { branchId: true, stock: true, active: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({
        where: { OR: [{ slug: { not: "combos" } }, { products: { some: { active: true } } }] },
        orderBy: { name: "asc" },
      }),
    ]);
    return {
      products: products.map((p) => {
        const stockByBranch: Record<string, number> = {};
        let totalStock = 0;
        for (const s of p.branchStock) {
          if (!s.active) continue;
          const n = Math.max(0, s.stock);
          stockByBranch[s.branchId] = n;
          totalStock += n;
        }
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: Number(p.price),
          compareAtPrice: p.compareAtPrice == null ? null : Number(p.compareAtPrice),
          material: p.material,
          specs: p.specs ?? null,
          images: p.images ?? [],
          featured: p.featured,
          category: p.category,
          stockByBranch,
          totalStock,
        };
      }),
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description })),
    };
  },
  ["catalog-snapshot-v2"],
  { tags: [CATALOG_TAG], revalidate: 300 }
);

/** Per request: one snapshot, however many catalog calls the page makes. */
const getSnapshot = cache(async (): Promise<Snapshot> => {
  try {
    return await loadSnapshot();
  } catch (err) {
    warnFallback(err);
    return {
      products: sampleProducts.map((p) => ({
        ...p,
        stockByBranch: {},
        totalStock: p.stock,
      })),
      categories: sampleCategories,
    };
  }
});

/** Resolve availability for a branch (or the chain-wide total when null). */
function toView(p: SnapshotProduct, branchId?: string | null): ProductView {
  return {
    ...p,
    stock: branchId ? (p.stockByBranch[branchId] ?? 0) : p.totalStock,
  };
}

async function listFor(branchId?: string | null): Promise<ProductView[]> {
  const { products } = await getSnapshot();
  return products.map((p) => toView(p, branchId));
}

// ---------- Categories ----------

export async function getCategories(): Promise<CategoryView[]> {
  return (await getSnapshot()).categories;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryView | null> {
  return (await getSnapshot()).categories.find((c) => c.slug === slug) ?? null;
}

// ---------- Products ----------

const onSaleNow = (p: ProductView) => p.compareAtPrice != null && p.compareAtPrice > p.price;

/** Newest first unless a price sort is picked; `q` ranks by relevance. */
export async function getProducts(
  filters: ProductFilters = {},
  branchId?: string | null
): Promise<ProductView[]> {
  const { categorySlug, q, minPrice, maxPrice, material, onSale, inStock, sort = "newest" } = filters;
  const products = await listFor(branchId);

  let list = products.filter(
    (p) =>
      (!categorySlug || p.category.slug === categorySlug) &&
      (!material || p.material === material) &&
      (!onSale || onSaleNow(p)) &&
      (!inStock || p.stock > 0) &&
      (minPrice == null || p.price >= minPrice) &&
      (maxPrice == null || p.price <= maxPrice)
  );
  if (q) list = applyQuery(list, q);
  if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  return list;
}

/** Products by id (cart refresh / buy-now), with availability for one branch. */
export async function getProductsByIds(ids: string[], branchId?: string | null): Promise<ProductView[]> {
  const wanted = new Set(ids);
  return (await listFor(branchId)).filter((p) => wanted.has(p.id));
}

/** The shop's `?q=` text filter: same typo-tolerant matching as /search. */
function applyQuery(list: ProductView[], q: string): ProductView[] {
  const cats = new Map<string, SearchCategory>();
  for (const p of list) {
    const c = cats.get(p.category.slug);
    if (c) c.count++;
    else cats.set(p.category.slug, { id: p.category.slug, name: p.category.name, slug: p.category.slug, description: null, count: 1 });
  }
  return searchCatalog(q, list, [...cats.values()]).products;
}

export async function getProductBySlug(slug: string, branchId?: string | null): Promise<ProductView | null> {
  return (await listFor(branchId)).find((p) => p.slug === slug) ?? null;
}

/** Featured pieces, newest first; the newest pieces when none are featured. */
export async function getFeaturedProducts(limit = 4, branchId?: string | null): Promise<ProductView[]> {
  const products = await listFor(branchId);
  const featured = products.filter((p) => p.featured);
  return (featured.length ? featured : products).slice(0, limit);
}

export async function getRelatedProducts(
  product: ProductView,
  branchId?: string | null,
  limit = 4
): Promise<ProductView[]> {
  const products = await listFor(branchId);
  return products.filter((p) => p.category.slug === product.category.slug && p.id !== product.id).slice(0, limit);
}

// ---------- Search ----------

/** Full /search answer: ranked pieces plus how the query was read. All
 *  categories are passed (even empty ones) so an empty category can say "coming soon". */
export async function searchStore(
  q: string,
  branchId?: string | null
): Promise<SearchResult & { categories: SearchCategory[]; all: ProductView[] }> {
  const { categories: list } = await getSnapshot();
  const products = await listFor(branchId);
  const categories = list.map((c) => ({
    ...c,
    count: products.filter((p) => p.category.slug === c.slug).length,
  }));
  return { ...searchCatalog(q, products, categories), categories, all: products };
}

// ---------- Shop sidebar facets ----------

/** Category counts (whole store) + price bounds, materials, sale and stock counts
 *  for the current category scope. */
export async function getShopFacets(
  categorySlug?: string,
  branchId?: string | null
): Promise<ShopFacets> {
  const { categories } = await getSnapshot();
  const rows = await listFor(branchId);

  const scoped = categorySlug ? rows.filter((r) => r.category.slug === categorySlug) : rows;
  const prices = (scoped.length ? scoped : rows).map((r) => r.price);
  const priceMin = prices.length ? Math.floor(Math.min(...prices) / 100) * 100 : 0;
  let priceMax = prices.length ? Math.ceil(Math.max(...prices) / 100) * 100 : 0;
  if (priceMax <= priceMin) priceMax = priceMin + 100;

  const materialCounts = new Map<string, number>();
  for (const r of scoped) {
    if (r.material) materialCounts.set(r.material, (materialCounts.get(r.material) ?? 0) + 1);
  }

  return {
    total: rows.length,
    categories: categories
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        count: rows.filter((r) => r.category.slug === c.slug).length,
      }))
      .filter((c) => c.count > 0),
    priceMin,
    priceMax,
    materials: [...materialCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    onSale: scoped.filter(onSaleNow).length,
    inStock: scoped.filter((r) => r.stock > 0).length,
  };
}
