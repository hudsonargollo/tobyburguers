"use client";

import { useEffect, useState } from "react";
import type { ShopFacets } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { FILTER_KEYS, ShopFilters, useShopQuery } from "./shop-filters";

const SORTS = [
  { value: "newest", label: "Más recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
];

/** Results bar above the grid: count, Sort, active-filter chips, and the mobile
 *  "Filters" drawer (the sidebar is hidden below lg). */
export function ShopToolbar({ count, facets }: { count: number; facets: ShopFacets }) {
  const { params, setParams, num } = useShopQuery();
  const [open, setOpen] = useState(false);

  const sort = params.get("sort") ?? "newest";
  const material = params.get("material");
  const minPrice = num("minPrice");
  const maxPrice = num("maxPrice");

  const chips: { label: string; clear: Record<string, null> }[] = [];
  if (minPrice != null || maxPrice != null) {
    const label =
      minPrice != null && maxPrice != null
        ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
        : minPrice != null
          ? `Desde ${formatPrice(minPrice)}`
          : `Hasta ${formatPrice(maxPrice!)}`;
    chips.push({ label, clear: { minPrice: null, maxPrice: null } });
  }
  if (params.get("sale") === "1") chips.push({ label: "En oferta", clear: { sale: null } });
  if (params.get("stock") === "1") chips.push({ label: "Solo disponibles", clear: { stock: null } });
  if (material) chips.push({ label: material, clear: { material: null } });

  const clearAll = () => setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));

  // Drawer: lock page scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-surface/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink transition hover:border-accent lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
            Filtros
            {chips.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.62rem] text-accent-soft">
                {chips.length}
              </span>
            )}
          </button>
          <p className="hidden text-sm text-muted sm:block">
            <span className="font-medium text-ink">{count}</span> {count === 1 ? "producto" : "productos"}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="hidden text-xs uppercase tracking-[0.14em] text-muted sm:inline">Ordenar por</span>
          <span className="relative">
            <select
              value={sort}
              onChange={(e) => setParams({ sort: e.target.value === "newest" ? null : e.target.value })}
              className="appearance-none rounded-full border border-[var(--line-strong)] bg-surface/70 py-2 pl-4 pr-9 text-sm text-ink outline-none transition hover:border-accent focus:border-accent"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-strong" fill="currentColor" aria-hidden="true">
              <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </label>
      </div>

      <p className="-mt-1 mb-4 text-sm text-muted sm:hidden">
        <span className="font-medium text-ink">{count}</span> {count === 1 ? "producto" : "productos"}
      </p>

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setParams(c.clear)}
              aria-label={`Quitar filtro: ${c.label}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/10 py-1.5 pl-3 pr-2 text-xs font-medium text-ink transition hover:border-accent hover:bg-accent hover:text-brand-deep"
            >
              {c.label}
              <span aria-hidden="true" className="text-sm leading-none">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-xs font-medium uppercase tracking-[0.12em] text-accent-strong underline-offset-4 hover:underline"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Mobile filter drawer */}
      <div
        // above the support-chat launcher (z-70); toasts (z-9999) still show on top
        className={`fixed inset-0 z-[80] lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
          className={`absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-cream shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <p className="font-display text-2xl font-semibold text-ink">Filtros</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar filtros"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-strong)] text-lg text-ink transition hover:border-accent"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <ShopFilters facets={facets} />
          </div>
          <div className="flex gap-3 border-t border-[var(--line)] px-5 py-4">
            {chips.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full bg-gradient-to-r from-accent-soft to-accent px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand"
            >
              Ver {count} {count === 1 ? "producto" : "productos"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
