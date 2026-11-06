"use client";

import { useEffect } from "react";
import { useCart } from "./cart-provider";

// Rendered on the order-confirmation page: removes the items that were just
// ordered from the cart (once, on mount). Anything else in the cart — e.g. when
// the order was a single-item "Buy it now" — stays.
export function ClearCart({ productIds }: { productIds?: string[] }) {
  const { clear, remove } = useCart();
  useEffect(() => {
    if (productIds) productIds.forEach(remove);
    else clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
