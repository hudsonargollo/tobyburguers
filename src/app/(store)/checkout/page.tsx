import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { CheckoutForm, type CheckoutDefaults } from "@/components/checkout-form";
import { payfastConfigured, safepayConfigured } from "@/lib/payments";
import { getProductBySlug } from "@/lib/catalog";
import { getSelectedBranch, shippingForBranch } from "@/lib/branch";
import { getStoreSettings } from "@/lib/settings";
import type { CartItem } from "@/components/cart/cart-provider";
import { toCartLine } from "@/lib/cart";

export const metadata: Metadata = {
  title: "Pago",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const p = Array.isArray(sp.payment) ? sp.payment[0] : sp.payment;
  const paymentNotice = p === "cancelled" || p === "failed" ? p : null;

  const buySlug = Array.isArray(sp.buy) ? sp.buy[0] : sp.buy;
  const qtyParam = Array.isArray(sp.qty) ? sp.qty[0] : sp.qty;

  // Every order belongs to one store; a branch must be picked before checkout.
  const branch = await getSelectedBranch();
  if (!branch) {
    const qs = new URLSearchParams();
    if (buySlug) qs.set("buy", buySlug);
    if (qtyParam) qs.set("qty", qtyParam);
    redirect(`/sucursal?next=${encodeURIComponent(`/checkout${qs.size ? `?${qs}` : ""}`)}`);
  }

  // Orders need an account: guests go to sign in and come straight back here
  // (the "Buy it now" choice is kept in the URL, the cart lives in the browser).
  const query = new URLSearchParams();
  if (buySlug) query.set("buy", buySlug);
  if (qtyParam) query.set("qty", qtyParam);
  const session = await requireCustomer(`/checkout${query.size ? `?${query}` : ""}`);

  const [product, phone, settings] = await Promise.all([
    buySlug ? getProductBySlug(buySlug, branch.id) : null,
    prisma.customer
      .findUnique({ where: { id: session.id }, select: { phone: true } })
      .then((c) => c?.phone ?? undefined)
      .catch(() => undefined), // phone is optional — ignore lookup failures
    getStoreSettings(),
  ]);

  // "Buy it now": check out a single product instead of the whole cart.
  let buyNow: CartItem | null = null;
  if (product && product.stock > 0) {
    const qtyRaw = Number(qtyParam);
    buyNow = {
      ...toCartLine(product),
      quantity: Math.min(product.stock, Math.max(1, Number.isFinite(qtyRaw) ? Math.floor(qtyRaw) : 1)),
    };
  }

  const defaults: CheckoutDefaults = { name: session.name, email: session.email, phone };

  return (
    <CheckoutForm
      defaults={defaults}
      paymentNotice={paymentNotice}
      buyNow={buyNow}
      branch={branch}
      shippingRules={shippingForBranch(branch, settings)}
      gateways={{ PAYFAST: payfastConfigured(), SAFEPAY: safepayConfigured() }}
    />
  );
}
