import type { ProductView } from "@/lib/types";
import { ProductCard } from "./product-card";

// "full": the grid has the page width (4 across on desktop). "sidebar": it
// shares the row with the shop filters, so 3 across keeps each card ~280px wide
// instead of a cramped ~190px.
const COLUMNS = {
  full: "grid-cols-2 lg:grid-cols-4",
  sidebar: "grid-cols-2 md:grid-cols-3",
};

export function ProductGrid({ products, layout = "full" }: { products: ProductView[]; layout?: keyof typeof COLUMNS }) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--line)] bg-surface/50 py-20 text-center">
        <p className="font-display text-xl text-ink">No encontramos nada en el menú</p>
        <p className="mt-1 text-sm text-muted">Prueba ajustando los filtros.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 ${COLUMNS[layout]}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
