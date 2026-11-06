// Plain, serializable view models used across the storefront UI.
// (Prisma returns Decimal for money — we convert to number here so these
//  objects can be safely passed to client components.)

export type CategoryView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  material: string | null;
  specs?: string | null;
  stock: number;
  images: string[];
  featured: boolean;
  category: { name: string; slug: string };
};

export type ProductFilters = {
  categorySlug?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  material?: string;
  /** Only pieces with a compare-at price above the selling price. */
  onSale?: boolean;
  /** Only pieces with stock left. */
  inStock?: boolean;
  sort?: "newest" | "price-asc" | "price-desc";
};

/** Counts and price bounds that drive the shop sidebar. */
export type ShopFacets = {
  /** Active pieces in the whole store. */
  total: number;
  categories: { name: string; slug: string; count: number }[];
  /** The rest are scoped to the current category (or the whole store). */
  priceMin: number;
  priceMax: number;
  materials: { name: string; count: number }[];
  onSale: number;
  inStock: number;
};
