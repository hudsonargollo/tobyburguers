import Link from "next/link";
import type { ProductView } from "@/lib/types";
import { ProductGrid } from "@/components/product-grid";

export function MenuSection({
  id,
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Ver todo",
  products,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  products: ProductView[];
}) {
  if (products.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-28 border-t border-[var(--line)] pt-10 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink text-balance sm:text-4xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted text-pretty sm:text-base">{description}</p>
        </div>
        {href ? (
          <Link
            href={href}
            className="text-sm font-semibold text-accent-strong transition hover:text-accent"
          >
            {linkLabel} →
          </Link>
        ) : null}
      </div>

      <div className="mt-7">
        <ProductGrid products={products} layout="full" />
      </div>
    </section>
  );
}
