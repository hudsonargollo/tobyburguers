import Link from "next/link";
import type { ProductView } from "@/lib/types";
import { formatPrice, discountPercent, savingsOf, visiblePack } from "@/lib/format";
import { SaleRibbon, SaveLine } from "./ui/sale-badge";
import { ProductImage } from "./product-image";
import { QuickAdd } from "./quick-add";

/** Simple product icon (package + label) used in the category label row. */
const LOW_STOCK = 5;

const CATEGORY_LABEL: Record<string, string> = {
  premium: "Premium",
  express: "Express",
  clasicas: "Clásica",
  plato: "En plato",
  philly: "Philly",
  boxy: "Boxy",
  pollo: "Pollo",
  "nuggets-alitas": "Nuggets",
  postres: "Postre",
};

/** "In stock" / "Only 3 left" / "Out of stock" under a regular price. */
function Availability({ stock }: { stock: number }) {
  const [dot, text, label] =
    stock <= 0
      ? ["bg-muted/60", "text-muted", "Agotado"]
      : stock <= LOW_STOCK
        ? ["bg-bad animate-pulse", "text-bad", `Quedan ${stock}`]
        : ["bg-ok", "text-ok", "En stock"];
  return (
    <p className={`mt-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${text}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </p>
  );
}

export function ProductCard({ product }: { product: ProductView }) {
  const off = discountPercent(product.price, product.compareAtPrice);
  const saved = savingsOf(product.price, product.compareAtPrice);
  const soldOut = product.stock <= 0;

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-xl border transition hover:border-accent hover:shadow-[0_18px_40px_-24px_rgba(110,10,6,0.5)] ${
        off ? "border-accent/55 bg-surface/70" : "border-[var(--line)] bg-gradient-to-b from-surface/80 to-cream-soft/60"
      }`}
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-white">
        <div className="h-full w-full transition duration-500 group-hover:scale-105">
          <ProductImage src={product.images[0]} alt={product.name} seed={product.slug} />
        </div>
        {/* keeps packshots on white while the card around them stays brand-warm */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_42%,transparent_58%,rgba(110,10,6,0.06)_100%)]"
        />
        {off ? <SaleRibbon percent={off} /> : null}
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.65rem] font-medium tracking-wide text-white">
            Agotado
          </span>
        )}
      </Link>

      <div className="relative flex flex-1 flex-col p-3 sm:p-4">
        {/* accent hairline where the photo meets the label */}
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" aria-hidden="true" />

        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">
          {CATEGORY_LABEL[product.category.slug] ?? product.category.name}
        </p>
        <Link href={`/product/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 font-display text-lg leading-snug text-ink transition-colors group-hover:text-accent-strong">
            {product.name}
          </h3>
        </Link>
        {visiblePack(product.material) && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
            <span className="text-xs text-muted">{visiblePack(product.material)}</span>
          </p>
        )}

        <div className="mt-auto pt-4">
          <div className="mt-3">
            {saved ? (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-lg font-semibold text-brand dark:text-accent-soft">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-sm text-muted line-through decoration-brand/50 dark:decoration-accent/60">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                </div>
                <SaveLine amount={saved} />
              </>
            ) : (
              <>
                <span className="block text-lg font-semibold text-ink">{formatPrice(product.price)}</span>
                <Availability stock={product.stock} />
              </>
            )}
          </div>
        </div>
        <QuickAdd product={product} />
      </div>
    </div>
  );
}
