import { formatPrice, savingsOf } from "@/lib/format";

// Sale presentation pieces shared by product cards, the product page, cart and
// checkout. Accent foil on brand so a discount reads instantly but stays on-brand.

function TagIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

/** Hanging accent ribbon pinned to the top-left of a product image: "15% OFF". */
export function SaleRibbon({ percent }: { percent: number }) {
  return (
    <span
      className="pointer-events-none absolute left-3 top-0 z-10 drop-shadow-[0_6px_10px_rgba(110,10,6,0.35)]"
      aria-label={`${percent}% de descuento`}
    >
      {/* brand body + accent edge: stands out on cream and accent product photos alike */}
      <span className="sale-ribbon block bg-gradient-to-b from-accent-soft via-accent to-accent-strong px-[2px] pb-[2px]">
        <span className="sale-ribbon sale-shine flex w-[3.4rem] flex-col items-center bg-gradient-to-b from-brand-dark via-brand to-brand-deep px-1 pb-5 pt-2.5 text-accent-soft [--sale-shine:rgba(236,208,140,0.45)]">
          <span className="font-display text-[1.45rem] font-bold leading-none">{percent}%</span>
          <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.24em]">Dto.</span>
        </span>
      </span>
    </span>
  );
}

/** Small "Save Bs 700" line under a card price. */
export function SaveLine({ amount }: { amount: number }) {
  return (
    <p className="mt-1 inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-accent-strong">
      <TagIcon className="h-3.5 w-3.5" />
      Ahorras {formatPrice(amount)}
    </p>
  );
}

/** Product-page price block when the piece is on sale. */
export function DealPanel({
  price,
  compareAt,
  percent,
}: {
  price: number;
  compareAt: number;
  percent: number;
}) {
  const saved = compareAt - price;
  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border border-accent/60 bg-gradient-to-br from-cream-soft via-surface to-panel p-5 shadow-[0_22px_50px_-34px_rgba(22,69,42,0.65)] sm:p-6">
      {/* faint accent glow in the corner */}
      <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/20 blur-2xl" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent-strong">
            <span aria-hidden="true">✦</span> Precio de oferta
          </p>
          <p className="mt-2 font-display text-4xl font-bold leading-none text-brand dark:text-accent-soft sm:text-[2.6rem]">
            {formatPrice(price)}
          </p>
          <p className="mt-2 text-sm text-muted">
            Precio normal{" "}
            <span className="text-base line-through decoration-brand/60 decoration-2 dark:decoration-accent/70">
              {formatPrice(compareAt)}
            </span>
          </p>
        </div>

        {/* Accent seal */}
        <div className="shrink-0 -rotate-6 rounded-full bg-gradient-to-br from-accent-soft via-accent to-accent-strong p-[3px] shadow-[0_12px_26px_-10px_rgba(232,190,26,0.85)]">
          <div className="sale-shine flex h-[5.25rem] w-[5.25rem] flex-col items-center justify-center rounded-full border-2 border-dashed border-brand/35 bg-gradient-to-br from-accent-soft via-accent to-accent-strong text-brand">
            <span className="font-display text-[1.9rem] font-bold leading-none">{percent}%</span>
            <span className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.24em]">Dto.</span>
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-3 rounded-xl bg-brand px-4 py-3 text-light">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-soft">
          <TagIcon className="h-4 w-4" />
        </span>
        <p className="text-sm leading-snug">
          Ahorras <span className="font-semibold text-accent-soft">{formatPrice(saved)}</span> en este producto
        </p>
      </div>
    </div>
  );
}

/** Brand strip for cart / checkout: "Ahorras Bs 1,400 en este pedido". */
export function SavingsStrip({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl bg-brand px-4 py-3 text-light ${className}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-soft">
        <TagIcon className="h-4 w-4" />
      </span>
      <p className="text-sm leading-snug">
        Ahorras <span className="font-semibold text-accent-soft">{formatPrice(amount)}</span> en este pedido
      </p>
    </div>
  );
}

/** Cart line total; on sale it adds the struck-through regular total and the saving. */
export function LinePrice({
  price,
  compareAt,
  quantity,
}: {
  price: number;
  compareAt?: number | null;
  quantity: number;
}) {
  const saved = savingsOf(price, compareAt);
  if (!saved || !compareAt) {
    return <span className="shrink-0 font-medium text-ink">{formatPrice(price * quantity)}</span>;
  }
  return (
    <div className="shrink-0 text-right">
      <span className="font-semibold text-brand dark:text-accent-soft">{formatPrice(price * quantity)}</span>
      <p className="text-sm text-muted line-through decoration-brand/50 dark:decoration-accent/60">
        {formatPrice(compareAt * quantity)}
      </p>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent-strong">
        Ahorras {formatPrice(saved * quantity)}
      </p>
    </div>
  );
}
