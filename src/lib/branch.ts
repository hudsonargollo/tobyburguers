import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./prisma";
import type { StoreSettings } from "./settings-shared";

// The branch a shopper picked is kept in a long-lived cookie. Browsing works
// without one (the storefront shows availability across the chain); it becomes
// mandatory the moment an order is started.
export const BRANCH_COOKIE = "toby_branch";

export type BranchView = {
  id: string;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  image: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  flatFee: number | null;
  freeThreshold: number | null;
};

export type BranchWithStock = BranchView & { products: number; units: number };

function toView(b: {
  id: string;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  image: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  flatFee: unknown;
  freeThreshold: unknown;
}): BranchView {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    code: b.code,
    address: b.address,
    city: b.city,
    phone: b.phone,
    whatsapp: b.whatsapp,
    hours: b.hours,
    image: b.image,
    mapsUrl: b.mapsUrl,
    latitude: b.latitude,
    longitude: b.longitude,
    deliveryEnabled: b.deliveryEnabled,
    pickupEnabled: b.pickupEnabled,
    flatFee: b.flatFee == null ? null : Number(b.flatFee),
    freeThreshold: b.freeThreshold == null ? null : Number(b.freeThreshold),
  };
}

/** Active branches, in display order. Never throws (storefront must render). */
export const getBranches = cache(async (): Promise<BranchView[]> => {
  try {
    const rows = await prisma.branch.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toView);
  } catch {
    return [];
  }
});

export const getBranchBySlug = cache(async (slug: string): Promise<BranchView | null> => {
  const branches = await getBranches();
  return branches.find((b) => b.slug === slug) ?? null;
});

/** Any branch by id (including inactive ones), for the admin panel. */
export const getBranchById = cache(async (id: string): Promise<BranchView | null> => {
  try {
    const b = await prisma.branch.findUnique({ where: { id } });
    return b ? toView(b) : null;
  } catch {
    return null;
  }
});

/** Branch picked by the shopper, or null when none/unavailable. */
export const getSelectedBranch = cache(async (): Promise<BranchView | null> => {
  const store = await cookies();
  const slug = store.get(BRANCH_COOKIE)?.value;
  if (!slug) return null;
  return (await getBranches()).find((b) => b.slug === slug) ?? null;
});

/** Shipping rules for a branch (falls back to store-wide settings). */
export function shippingForBranch(
  branch: { flatFee: number | null; freeThreshold: number | null } | null,
  settings: Pick<StoreSettings, "shipping">
): StoreSettings["shipping"] {
  return {
    flatFee: branch?.flatFee ?? settings.shipping.flatFee,
    freeThreshold: branch?.freeThreshold ?? settings.shipping.freeThreshold,
    deliveryTime: settings.shipping.deliveryTime,
  };
}
