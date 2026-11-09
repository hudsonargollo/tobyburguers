// Store settings shape + pure helpers. Client-safe (no server imports) so the
// checkout form, footer, chat etc. can use the values passed down to them.

/**
 * Loyalty programme rules. Two currencies: stamps earned per qualifying unit
 * (stampsToFree of one product = that product free) and points earned per
 * amount spent (pointsPer every pointsAmount Bs), pooled in the rewards shop.
 */
export type LoyaltySettings = {
  enabled: boolean;
  /** Brand-facing name, e.g. "Club Toby". */
  name: string;
  stampsToFree: number;
  /** What earns a stamp: the whole menu, listed categories, or listed products. */
  eligible: "all" | "category" | "product";
  /** Category or product slugs for the mode above; ignored when "all". */
  eligibleSlugs: string[];
  pointsPer: number;
  /** Bs of spend that grants pointsPer points. */
  pointsAmount: number;
  /** Whether delivery also counts toward points. */
  pointsOnShipping: boolean;
  /** 0 = stamps and points never lapse. */
  expiryDays: number;
};

export type StoreSettings = {
  contact: {
    email: string;
    /** Display format, e.g. "+591 70 000 000" */
    phone: string;
    /** International digits only, e.g. "59170000000" */
    whatsapp: string;
    city: string;
    hours: string;
  };
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
  };
  shipping: {
    flatFee: number;
    freeThreshold: number;
    deliveryTime: string;
  };
  /** Lines shown in the scrolling announcement bar */
  announcements: string[];
  inventory: {
    lowStockThreshold: number;
  };
  /** Rules of the loyalty programme, edited in Admin → Club Toby. */
  loyalty: LoyaltySettings;
  notifications: {
    /** Where new-order / contact alerts go (falls back to ADMIN_NOTIFY_EMAIL / SMTP_USER) */
    orderEmail: string;
  };
};

export function whatsappUrl(s: StoreSettings): string {
  return s.contact.whatsapp ? `https://wa.me/${s.contact.whatsapp}` : "";
}

export function phoneHref(s: StoreSettings): string {
  return s.contact.phone ? `tel:${s.contact.phone.replace(/[^0-9+]/g, "")}` : "";
}

export function shippingFor(subtotal: number, s: StoreSettings["shipping"]): number {
  return subtotal >= s.freeThreshold ? 0 : s.flatFee;
}
