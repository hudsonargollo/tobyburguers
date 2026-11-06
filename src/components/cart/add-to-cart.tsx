"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "./cart-provider";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/format";

export function AddToCart({ product }: { product: Omit<CartItem, "quantity"> }) {
  const { add } = useCart();
  const toast = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number | null>(null);
  const soldOut = product.stock <= 0;

  useEffect(
    () => () => {
      if (addedTimer.current) window.clearTimeout(addedTimer.current);
    },
    []
  );

  function handleAdd() {
    add(product, qty);
    setAdded(true);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1800);
    toast.success(`${qty} × ${product.name} agregado a tu carrito`, { title: "Agregado al carrito" });
  }

  // Checks out just this product (the rest of the cart is left untouched).
  function handleBuyNow() {
    router.push(`/checkout?buy=${encodeURIComponent(product.slug)}&qty=${qty}`);
  }

  if (soldOut) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-full border border-[var(--line)] px-8 py-3.5 text-sm font-medium tracking-wide text-muted"
      >
        Agotado
      </button>
    );
  }

  const stepBtn =
    "flex h-11 w-10 items-center justify-center text-lg text-ink transition hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-35 dark:text-light";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div
          className="flex items-center justify-center rounded-full border border-[var(--line-strong)] bg-surface"
          role="group"
          aria-label={`Cantidad de ${product.name}`}
        >
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className={`rounded-l-full ${stepBtn}`}
            aria-label="Quitar una unidad"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-8 text-center text-sm font-semibold tabular-nums"
          >
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            disabled={qty >= product.stock}
            className={`rounded-r-full ${stepBtn}`}
            aria-label="Agregar una unidad"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.06em] transition duration-200 active:scale-[0.98] sm:px-7 ${
            added
              ? "bg-accent text-brand-deep shadow-[0_16px_34px_-16px_rgba(232,190,26,0.95)]"
              : "bg-brand text-light shadow-[0_16px_34px_-16px_rgba(224,35,26,0.8)] hover:bg-brand-deep"
          }`}
        >
          {added ? <CheckIcon /> : <CartIcon />}
          <span>{added ? "Agregado" : "Agregar al carrito"}</span>
        </button>
      </div>

      <p className="text-center text-xs text-muted sm:text-left">
        {qty} × {formatPrice(product.price)} ={" "}
        <span className="font-semibold tabular-nums text-ink">{formatPrice(product.price * qty)}</span>
      </p>

      <button
        type="button"
        onClick={handleBuyNow}
        className="w-full rounded-full bg-gradient-to-r from-accent-soft to-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.08em] text-brand shadow-[0_14px_34px_-14px_rgba(232,190,26,0.7)] transition hover:opacity-90"
      >
        Comprar ahora
      </button>
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
