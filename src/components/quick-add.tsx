"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart/cart-provider";
import { useToast } from "@/components/ui/toast";
import type { ProductView } from "@/lib/types";
import { toCartLine } from "@/lib/cart";

const MAX_QTY = 20;

// Quantity stepper + add button used on product cards.
export function QuickAdd({ product }: { product: ProductView }) {
  const { add } = useCart();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number | null>(null);
  const soldOut = product.stock <= 0;
  const max = Math.max(1, Math.min(product.stock, MAX_QTY));

  useEffect(() => () => {
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
  }, []);

  if (soldOut) {
    return (
      <p className="mt-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
        Agotado
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div
        className="flex h-10 shrink-0 items-center rounded-full border border-[var(--line-strong)] bg-surface"
        role="group"
        aria-label={`Cantidad de ${product.name}`}
      >
        <button
          type="button"
          onClick={() => setQty((value) => Math.max(1, value - 1))}
          disabled={qty <= 1}
          aria-label="Quitar una unidad"
          className="flex h-10 w-8 items-center justify-center rounded-l-full text-base text-muted transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-accent-soft"
        >
          −
        </button>
        <span
          aria-live="polite"
          className="min-w-6 text-center text-sm font-semibold tabular-nums text-ink"
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((value) => Math.min(max, value + 1))}
          disabled={qty >= max}
          aria-label="Agregar una unidad"
          className="flex h-10 w-8 items-center justify-center rounded-r-full text-base text-muted transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-accent-soft"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          add(toCartLine(product), qty);
          setQty(1);
          setAdded(true);
          if (addedTimer.current) window.clearTimeout(addedTimer.current);
          addedTimer.current = window.setTimeout(() => setAdded(false), 1500);
          toast.success(
            `${qty} × ${product.name} al carrito`,
            { title: "Agregado al carrito" }
          );
        }}
        aria-label={`Agregar ${qty} ${product.name} al carrito`}
        title="Agregar al carrito"
        className={`flex h-10 min-w-[8.5rem] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold uppercase tracking-[0.08em] transition duration-200 active:scale-[0.98] ${
          added
            ? "bg-accent text-brand-deep shadow-[0_12px_26px_-14px_rgba(232,190,26,0.95)]"
            : "bg-brand text-light shadow-[0_12px_26px_-14px_rgba(224,35,26,0.8)] hover:bg-brand-deep"
        }`}
      >
        {added ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="20" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
            <path d="M14 9v5M11.5 11.5h5" strokeLinecap="round" />
          </svg>
        )}
        <span>{added ? "Agregado" : "Agregar"}</span>
      </button>
    </div>
  );
}
