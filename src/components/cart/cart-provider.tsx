"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useMounted } from "@/lib/use-mounted";
import { savingsOf } from "@/lib/format";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  /** Regular price when the piece is on sale (savings shown in cart / checkout). */
  compareAtPrice?: number | null;
  image?: string;
  material?: string | null;
  stock: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** Total bolivianos saved vs regular prices across the cart. */
  savings: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, qty: number) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "toby-cart-v1";
const EMPTY: CartItem[] = [];

// ---------- localStorage-backed external store (synced across tabs) ----------

let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    cache = []; // corrupt or unavailable storage
  }
  return cache;
}

function write(next: CartItem[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null; // another tab changed the cart
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Clamp to available stock. A sold-out item (stock 0) clamps to 0 = removed.
const clamp = (qty: number, stock: number) => Math.max(0, Math.min(Math.floor(qty), stock));

function update(fn: (prev: CartItem[]) => CartItem[]) {
  write(fn(read()).filter((i) => i.quantity > 0));
}

// Refresh price / stock / availability snapshots from the server once per page
// load, so the cart and checkout totals match what will actually be charged.
let refreshed = false;
async function refreshFromServer() {
  const items = read();
  if (refreshed || items.length === 0) return;
  refreshed = true;
  try {
    const res = await fetch("/api/cart/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: items.map((i) => i.id) }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      ok: boolean;
      products?: { id: string; name: string; price: number; compareAtPrice: number | null; stock: number }[];
    };
    if (!data.ok || !data.products) return;
    const byId = new Map(data.products.map((p) => [p.id, p]));
    update((prev) =>
      prev.map((i) => {
        const p = byId.get(i.id);
        if (!p) return { ...i, quantity: 0 }; // no longer sold
        return {
          ...i,
          name: p.name,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          stock: p.stock,
          quantity: clamp(i.quantity, p.stock),
        };
      })
    );
  } catch {
    /* offline / DB down — checkout re-validates anyway */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const ready = useMounted();
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  useEffect(() => {
    void refreshFromServer();
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      savings: items.reduce((s, i) => s + (savingsOf(i.price, i.compareAtPrice) ?? 0) * i.quantity, 0),
      ready,
      add: (item, qty = 1) =>
        update((prev) => {
          const existing = prev.find((i) => i.id === item.id);
          if (existing) {
            return prev.map((i) =>
              i.id === item.id
                ? { ...i, ...item, quantity: clamp(i.quantity + qty, item.stock) }
                : i
            );
          }
          return [...prev, { ...item, quantity: clamp(qty, item.stock) }];
        }),
      remove: (id) => update((prev) => prev.filter((i) => i.id !== id)),
      setQuantity: (id, qty) =>
        update((prev) =>
          prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, clamp(qty, i.stock)) } : i))
        ),
      clear: () => write([]),
    }),
    [items, ready]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
