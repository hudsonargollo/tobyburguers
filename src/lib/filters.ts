import type { ProductFilters } from "./types";

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function num(v: string | string[] | undefined): number | undefined {
  const s = first(v);
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Turns URL search params into a validated ProductFilters object.
export function parseProductFilters(sp: RawParams): ProductFilters {
  const sortRaw = first(sp.sort);
  const sort =
    sortRaw === "price-asc" || sortRaw === "price-desc" || sortRaw === "newest"
      ? sortRaw
      : "newest";

  let minPrice = num(sp.minPrice);
  let maxPrice = num(sp.maxPrice);
  // A reversed range (min > max) would match nothing — treat it as swapped.
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    q: first(sp.q)?.trim().slice(0, 100) || undefined,
    material: first(sp.material),
    minPrice,
    maxPrice,
    onSale: first(sp.sale) === "1" || undefined,
    inStock: first(sp.stock) === "1" || undefined,
    sort,
  };
}
