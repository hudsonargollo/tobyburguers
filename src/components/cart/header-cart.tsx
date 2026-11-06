"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function HeaderCart({ className = "" }: { className?: string }) {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Carrito${ready && count ? `, ${count} productos` : ""}`}
      className={className || "relative transition-colors hover:text-accent"}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 8h12l-1 12H7L6 8z" strokeLinejoin="round" />
        <path d="M9 8a3 3 0 0 1 6 0" strokeLinecap="round" />
      </svg>
      {ready && count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-accent-soft to-accent px-1 text-[0.62rem] font-semibold text-brand shadow-sm ring-2 ring-light">
          {count}
        </span>
      )}
    </Link>
  );
}
